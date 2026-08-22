import { flushSync } from "react-dom";

type Task04DomListener = (event: Task04DomEvent) => void;

export class Task04DomEvent {
  readonly bubbles = true;
  readonly cancelable = true;
  readonly isTrusted = false;
  readonly timeStamp = Date.now();
  target: Task04DomNode | null = null;
  currentTarget: Task04DomNode | null = null;
  defaultPrevented = false;
  cancelBubble = false;
  returnValue = true;

  constructor(readonly type: string) {}

  preventDefault(): void {
    this.defaultPrevented = true;
    this.returnValue = false;
  }

  stopPropagation(): void {
    this.cancelBubble = true;
  }

  stopImmediatePropagation(): void {
    this.cancelBubble = true;
  }
}

class Task04DomFormData {}

export class Task04DomNode {
  parentNode: Task04DomNode | null = null;
  readonly childNodes: Task04DomNode[] = [];
  nodeValue: string | null = null;
  private readonly listeners =
    new Map<string, Task04DomListener[]>();

  constructor(
    readonly nodeType: number,
    readonly nodeName: string,
    readonly ownerDocument: Task04DomDocument,
  ) {}

  appendChild<T extends Task04DomNode>(child: T): T {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore<T extends Task04DomNode>(
    child: T,
    before: Task04DomNode | null,
  ): T {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    const beforeIndex =
      before === null ? -1 : this.childNodes.indexOf(before);
    this.childNodes.splice(
      beforeIndex < 0 ? this.childNodes.length : beforeIndex,
      0,
      child,
    );
    return child;
  }

  removeChild<T extends Task04DomNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  addEventListener(
    type: string,
    listener: Task04DomListener,
  ): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: Task04DomListener,
  ): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter(
        (candidate) => candidate !== listener,
      ),
    );
  }

  dispatchEvent(event: Task04DomEvent): boolean {
    event.target ??= this;
    const previousWindowEvent =
      this.ownerDocument.defaultView.event;
    this.ownerDocument.defaultView.event = event;
    try {
      const eventPath: Task04DomNode[] = [this];
      for (
        let pathNode: Task04DomNode | null = this.parentNode;
        pathNode !== null;
        pathNode = pathNode.parentNode
      ) {
        eventPath.push(pathNode);
      }
      for (const currentNode of eventPath) {
        event.currentTarget = currentNode;
        for (const listener of [
          ...(currentNode.listeners.get(event.type) ?? []),
        ]) {
          listener(event);
          if (event.cancelBubble) break;
        }
        if (event.cancelBubble) break;
      }
    } finally {
      event.currentTarget = null;
      this.ownerDocument.defaultView.event =
        previousWindowEvent;
    }
    return !event.defaultPrevented;
  }

  contains(candidate: Task04DomNode | null): boolean {
    let current = candidate;
    while (current !== null) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }

  querySelectorAll(selector: string): Task04DomElement[] {
    const radioSelector =
      /^input\[name="([^"]+)"\]\[type="radio"\]$/.exec(
        selector,
      );
    if (radioSelector === null) return [];
    return task04DomElementsUnder(this).filter(
      (element) =>
        element.tagName === "INPUT" &&
        element.name === radioSelector[1] &&
        element.type === "radio",
    );
  }

  get firstChild(): Task04DomNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): Task04DomNode | null {
    return this.childNodes.at(-1) ?? null;
  }

  get nextSibling(): Task04DomNode | null {
    if (this.parentNode === null) return null;
    const index = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[index + 1] ?? null;
  }

  get textContent(): string {
    if (this.nodeType === 3 || this.nodeType === 8) {
      return this.nodeValue ?? "";
    }
    return this.childNodes
      .map((child) => child.textContent)
      .join("");
  }

  set textContent(value: string) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes.splice(0);
    if (value !== "") {
      this.appendChild(
        this.ownerDocument.createTextNode(value),
      );
    }
  }
}

export class Task04DomElement extends Task04DomNode {
  readonly tagName: string;
  readonly namespaceURI: string;
  readonly style: Record<string, string> = {};
  value = "";
  checked = false;
  selected = false;
  disabled = false;
  multiple = false;
  className = "";
  id = "";
  type = "";
  name = "";
  private readonly attributes = new Map<string, string>();

  constructor(
    name: string,
    ownerDocument: Task04DomDocument,
    namespaceURI = "http://www.w3.org/1999/xhtml",
  ) {
    const normalizedName = name.toUpperCase();
    super(1, normalizedName, ownerDocument);
    this.tagName = normalizedName;
    this.namespaceURI = namespaceURI;
  }

  setAttribute(name: string, value: string): void {
    const normalizedName = name.toLowerCase();
    const normalizedValue = String(value);
    this.attributes.set(normalizedName, normalizedValue);
    if (normalizedName === "class") this.className = normalizedValue;
    if (normalizedName === "id") this.id = normalizedValue;
    if (normalizedName === "type") this.type = normalizedValue;
    if (normalizedName === "name") this.name = normalizedValue;
    if (normalizedName === "value") this.value = normalizedValue;
    if (normalizedName === "disabled") this.disabled = true;
    if (normalizedName === "multiple") this.multiple = true;
  }

  setAttributeNS(
    _namespace: string | null,
    name: string,
    value: string,
  ): void {
    this.setAttribute(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }

  removeAttribute(name: string): void {
    const normalizedName = name.toLowerCase();
    this.attributes.delete(normalizedName);
    if (normalizedName === "disabled") this.disabled = false;
    if (normalizedName === "multiple") this.multiple = false;
  }

  removeAttributeNS(
    _namespace: string | null,
    name: string,
  ): void {
    this.removeAttribute(name);
  }

  get options(): Task04DomElement[] {
    return task04DomElementsUnder(this).filter(
      (element) => element.tagName === "OPTION",
    );
  }

  focus(): void {
    this.ownerDocument.activeElement = this;
  }

  blur(): void {
    if (this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement =
        this.ownerDocument.body;
    }
  }
}

export class Task04DomDocument extends Task04DomNode {
  readonly documentElement: Task04DomElement;
  readonly body: Task04DomElement;
  activeElement: Task04DomElement;
  defaultView!: Task04DomWindow;

  constructor() {
    super(
      9,
      "#document",
      undefined as unknown as Task04DomDocument,
    );
    Object.defineProperty(this, "ownerDocument", {
      configurable: false,
      enumerable: true,
      value: this,
    });
    this.documentElement = this.createElement("html");
    this.body = this.createElement("body");
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this.activeElement = this.body;
  }

  createElement(name: string): Task04DomElement {
    return new Task04DomElement(name, this);
  }

  createElementNS(
    namespaceURI: string,
    name: string,
  ): Task04DomElement {
    return new Task04DomElement(name, this, namespaceURI);
  }

  createTextNode(value: string): Task04DomNode {
    const node = new Task04DomNode(3, "#text", this);
    node.nodeValue = value;
    return node;
  }

  createComment(value: string): Task04DomNode {
    const node = new Task04DomNode(8, "#comment", this);
    node.nodeValue = value;
    return node;
  }

  getElementById(id: string): Task04DomElement | null {
    return (
      task04DomElementsUnder(this).find(
        (element) => element.id === id,
      ) ?? null
    );
  }
}

type Task04DomWindow = {
  document: Task04DomDocument;
  Node: typeof Task04DomNode;
  Element: typeof Task04DomElement;
  HTMLElement: typeof Task04DomElement;
  HTMLIFrameElement: new () => object;
  event?: Task04DomEvent;
  addEventListener: () => void;
  removeEventListener: () => void;
  getSelection: () => null;
};

export function task04DomElementsUnder(
  root: Task04DomNode,
): Task04DomElement[] {
  return root.childNodes.flatMap((child) => [
    ...(child instanceof Task04DomElement ? [child] : []),
    ...task04DomElementsUnder(child),
  ]);
}

export function task04ElementById(
  root: Task04DomNode,
  id: string,
): Task04DomElement {
  const element = task04DomElementsUnder(root).find(
    (candidate) => candidate.id === id,
  );
  if (element === undefined) {
    throw new Error(`TASK04_TEST_ELEMENT_NOT_FOUND:${id}`);
  }
  return element;
}

export function task04ElementsByName(
  root: Task04DomNode,
  name: string,
): Task04DomElement[] {
  return task04DomElementsUnder(root).filter(
    (candidate) => candidate.name === name,
  );
}

export function task04ButtonByText(
  root: Task04DomNode,
  label: string,
): Task04DomElement {
  const button = task04DomElementsUnder(root).find(
    (element) =>
      element.tagName === "BUTTON" &&
      element.textContent === label,
  );
  if (button === undefined) {
    throw new Error(`TASK04_TEST_BUTTON_NOT_FOUND:${label}`);
  }
  return button;
}

export function task04MaybeButtonByText(
  root: Task04DomNode,
  label: string,
): Task04DomElement | undefined {
  return task04DomElementsUnder(root).find(
    (element) =>
      element.tagName === "BUTTON" &&
      element.textContent === label,
  );
}

export function task04ElementIsDisabled(
  element: Task04DomElement,
): boolean {
  let current: Task04DomNode | null = element;
  while (current !== null) {
    if (
      current instanceof Task04DomElement &&
      current.disabled &&
      (current === element || current.tagName === "FIELDSET")
    ) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

export function task04DispatchChange(
  element: Task04DomElement,
  value: string,
): void {
  if (task04ElementIsDisabled(element)) return;
  flushSync(() => {
    element.value = value;
    if (element.tagName === "INPUT") {
      element.dispatchEvent(new Task04DomEvent("input"));
    }
    element.dispatchEvent(new Task04DomEvent("change"));
  });
}

export function task04DispatchChecked(
  element: Task04DomElement,
  checked: boolean,
): void {
  if (task04ElementIsDisabled(element)) return;
  flushSync(() => {
    element.checked = checked;
    element.dispatchEvent(new Task04DomEvent("click"));
    element.dispatchEvent(new Task04DomEvent("change"));
  });
}

export function task04Click(element: Task04DomElement): void {
  if (task04ElementIsDisabled(element)) return;
  flushSync(() => {
    const clickEvent = new Task04DomEvent("click");
    element.dispatchEvent(clickEvent);
    if (
      clickEvent.defaultPrevented ||
      element.tagName !== "BUTTON" ||
      (element.type || element.getAttribute("type")) === "button"
    ) {
      return;
    }
    let form: Task04DomNode | null = element.parentNode;
    while (
      form instanceof Task04DomElement &&
      form.tagName !== "FORM"
    ) {
      form = form.parentNode;
    }
    if (
      form instanceof Task04DomElement &&
      form.tagName === "FORM"
    ) {
      form.dispatchEvent(new Task04DomEvent("submit"));
    }
  });
}

export type Task04Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}>;

export function task04Deferred<T>(): Task04Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

export async function task04Eventually(
  assertion: () => void,
): Promise<void> {
  let lastFailure: unknown;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      assertion();
      return;
    } catch (failure) {
      lastFailure = failure;
      await new Promise<void>((resolvePromise) => {
        setTimeout(resolvePromise, 0);
      });
    }
  }
  throw lastFailure;
}

export function installTask04TestDom(): Readonly<{
  document: Task04DomDocument;
  restore: () => void;
}> {
  const descriptors = new Map<
    string,
    PropertyDescriptor | undefined
  >();
  const document = new Task04DomDocument();
  class Task04DomIFrameElement {}
  const window: Task04DomWindow = {
    document,
    Node: Task04DomNode,
    Element: Task04DomElement,
    HTMLElement: Task04DomElement,
    HTMLIFrameElement: Task04DomIFrameElement,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getSelection: () => null,
  };
  document.defaultView = window;
  for (const [name, value] of [
    ["window", window],
    ["document", document],
    ["Node", Task04DomNode],
    ["Element", Task04DomElement],
    ["HTMLElement", Task04DomElement],
    ["FormData", Task04DomFormData],
  ] as const) {
    descriptors.set(
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    );
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  return {
    document,
    restore(): void {
      for (const [name, descriptor] of descriptors) {
        if (descriptor === undefined) {
          Reflect.deleteProperty(globalThis, name);
        } else {
          Object.defineProperty(
            globalThis,
            name,
            descriptor,
          );
        }
      }
    },
  };
}
