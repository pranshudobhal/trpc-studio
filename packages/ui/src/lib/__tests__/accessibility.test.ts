import {
  generateId,
  isFocusable,
  isVisible,
  KeyboardUtils,
  AriaAttributesBuilder,
  aria,
} from '../accessibility';

describe('generateId', () => {
  it('should generate unique IDs with prefix', () => {
    const id1 = generateId('test');
    const id2 = generateId('test');

    expect(id1).toMatch(/^test-/);
    expect(id2).toMatch(/^test-/);
    expect(id1).not.toBe(id2);
  });

  it('should use default prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^trpc-studio-/);
  });
});

describe('isFocusable', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should return false for disabled elements', () => {
    const button = document.createElement('button');
    button.disabled = true;
    document.body.appendChild(button);

    expect(isFocusable(button)).toBe(false);
  });

  it('should return false for elements with tabindex -1', () => {
    const div = document.createElement('div');
    div.setAttribute('tabindex', '-1');
    document.body.appendChild(div);

    expect(isFocusable(div)).toBe(false);
  });

  it('should return true for elements with positive tabindex', () => {
    const div = document.createElement('div');
    div.setAttribute('tabindex', '0');
    document.body.appendChild(div);

    expect(isFocusable(div)).toBe(true);
  });

  it('should return true for naturally focusable elements', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    expect(isFocusable(button)).toBe(true);
  });

  it('should return true for contenteditable elements', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);

    expect(isFocusable(div)).toBe(true);
  });
});

describe('KeyboardUtils', () => {
  it('should identify activation keys', () => {
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    const otherEvent = new KeyboardEvent('keydown', { key: 'a' });

    expect(KeyboardUtils.isActivationKey(enterEvent)).toBe(true);
    expect(KeyboardUtils.isActivationKey(spaceEvent)).toBe(true);
    expect(KeyboardUtils.isActivationKey(otherEvent)).toBe(false);
  });

  it('should identify arrow keys', () => {
    const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    const otherEvent = new KeyboardEvent('keydown', { key: 'a' });

    expect(KeyboardUtils.isArrowKey(arrowUpEvent)).toBe(true);
    expect(KeyboardUtils.isArrowKey(arrowDownEvent)).toBe(true);
    expect(KeyboardUtils.isArrowKey(otherEvent)).toBe(false);
  });

  it('should identify navigation keys', () => {
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
    const otherEvent = new KeyboardEvent('keydown', { key: 'a' });

    expect(KeyboardUtils.isNavigationKey(tabEvent)).toBe(true);
    expect(KeyboardUtils.isNavigationKey(homeEvent)).toBe(true);
    expect(KeyboardUtils.isNavigationKey(otherEvent)).toBe(false);
  });

  it('should identify type-ahead keys', () => {
    const letterEvent = new KeyboardEvent('keydown', { key: 'a' });
    const numberEvent = new KeyboardEvent('keydown', { key: '1' });
    const ctrlEvent = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
    const specialEvent = new KeyboardEvent('keydown', { key: 'Enter' });

    expect(KeyboardUtils.isTypeAheadKey(letterEvent)).toBe(true);
    expect(KeyboardUtils.isTypeAheadKey(numberEvent)).toBe(true);
    expect(KeyboardUtils.isTypeAheadKey(ctrlEvent)).toBe(false);
    expect(KeyboardUtils.isTypeAheadKey(specialEvent)).toBe(false);
  });
});

describe('AriaAttributesBuilder', () => {
  it('should build aria attributes', () => {
    const attributes = aria()
      .label('Test label')
      .expanded(true)
      .selected(false)
      .role('button')
      .tabIndex(0)
      .build();

    expect(attributes).toEqual({
      'aria-label': 'Test label',
      'aria-expanded': true,
      'aria-selected': false,
      role: 'button',
      tabIndex: 0,
    });
  });

  it('should chain methods', () => {
    const builder = aria().label('Test').expanded(true);

    expect(builder).toBeInstanceOf(AriaAttributesBuilder);
  });

  it('should handle all aria attributes', () => {
    const attributes = aria()
      .labelledBy('label-id')
      .describedBy('desc-id')
      .pressed(true)
      .checked('mixed')
      .disabled(false)
      .hidden(true)
      .hasPopup('menu')
      .controls('control-id')
      .owns('owns-id')
      .build();

    expect(attributes).toEqual({
      'aria-labelledby': 'label-id',
      'aria-describedby': 'desc-id',
      'aria-pressed': true,
      'aria-checked': 'mixed',
      'aria-disabled': false,
      'aria-hidden': true,
      'aria-haspopup': 'menu',
      'aria-controls': 'control-id',
      'aria-owns': 'owns-id',
    });
  });
});
