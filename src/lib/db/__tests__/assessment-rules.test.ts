import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSameDayMutex, createAssessment, getIntakeSessionById } from '../../../app/(site)/pharmacist/actions';
import { createIntakeSession, logTriageExit } from '../../../app/(intake)/assessment/actions';

// Note: These tests require a test database environment or mocked db module.
// This is a structural scaffold for the requested rule validations.

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      claimRule: { findMany: vi.fn() },
      assessment: { findFirst: vi.fn(), findMany: vi.fn() },
      intakeSession: { findFirst: vi.fn() },
      patient: { findFirst: vi.fn() }
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: 'mock-id', code: 'MOCKCD' }])
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn()
      }))
    }))
  }
}));

describe('Assessment Rules & Constraints', () => {

  describe('Same-Day Mutex (Insect / Tick Bites)', () => {
    it('should reject assessment if patient had mutually exclusive assessment today', async () => {
      // Mock db to return the mutex rule and an existing assessment
      const { db } = await import('@/lib/db');
      (db.query.claimRule.findMany as any).mockResolvedValue([
        {
          ruleType: "same_day_mutex",
          ailmentCodes: ["INSECT_BITES", "TICK_BITES"],
          description: "Cannot claim both insect and tick bites on the same day."
        }
      ]);
      (db.query.assessment.findFirst as any).mockResolvedValue({ id: 'existing-id' });

      const res = await checkSameDayMutex('pat-123', 'TICK_BITES', new Date());
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Patient already assessed for INSECT_BITES today');
    });

    it('should allow assessment if no mutually exclusive assessment exists', async () => {
      const { db } = await import('@/lib/db');
      (db.query.claimRule.findMany as any).mockResolvedValue([
        {
          ruleType: "same_day_mutex",
          ailmentCodes: ["INSECT_BITES", "TICK_BITES"]
        }
      ]);
      (db.query.assessment.findFirst as any).mockResolvedValue(null);

      const res = await checkSameDayMutex('pat-123', 'TICK_BITES', new Date());
      expect(res.allowed).toBe(true);
    });
  });

  describe('One-Per-Day Constraint', () => {
    it('createAssessment handles unique constraint violation for same ailment on same day', async () => {
      const { db } = await import('@/lib/db');
      // Simulate Postgres unique constraint violation
      (db.insert as any).mockImplementationOnce(() => {
        throw { code: "23505" };
      });
      (db.query.claimRule.findMany as any).mockResolvedValue([]);

      const res = await createAssessment({
        pharmacyId: 'pharm-1',
        patientId: 'pat-1',
        ailmentGroupCode: 'RHINITIS',
        modality: 'in_person',
        outcome: 'rx_issued',
        serviceDate: new Date(),
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Patient already has an assessment for this ailment today.');
    });
  });

  describe('Intake Session Expiry & Single-Use', () => {
    it('getIntakeSessionById rejects expired or consumed sessions', async () => {
      const { db } = await import('@/lib/db');
      (db.query.intakeSession.findFirst as any).mockResolvedValue(null);

      const res = await getIntakeSessionById('sess-expired', 'pharm-1');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('no longer available');
      }
    });

    it('createAssessment consumes the intake session', async () => {
      const { db } = await import('@/lib/db');
      (db.query.claimRule.findMany as any).mockResolvedValue([]);
      const updateMock = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }));
      (db.update as any) = updateMock;

      await createAssessment({
        pharmacyId: 'pharm-1',
        patientId: 'pat-1',
        ailmentGroupCode: 'RHINITIS',
        modality: 'in_person',
        outcome: 'rx_issued',
        intakeSessionId: 'sess-123',
        serviceDate: new Date(),
      });

      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('Red-Flag Exit', () => {
    it('writes to triage_exit and does not create an assessment', async () => {
      const { db } = await import('@/lib/db');
      const insertMock = vi.fn(() => ({ values: vi.fn() }));
      (db.insert as any) = insertMock;

      await logTriageExit({
        ailmentGroupCode: 'RHINITIS',
        reason: 'Red flags selected: Shortness of breath'
      });

      // It should only insert into triage_exit, not assessment.
      expect(insertMock).toHaveBeenCalledTimes(1);
    });
  });
});
