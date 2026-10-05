// Loaded only by the local demo launcher, never imported by application code.
// Freeze wall-clock dates; timers and performance.now continue normally.
const NativeDate = globalThis.Date;
const instant = NativeDate.parse('2026-10-05T04:00:00.000Z');
class DemoDate extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [instant])); }
  static now() { return instant; }
  static parse(value) { return NativeDate.parse(value); }
  static UTC(...args) { return NativeDate.UTC(...args); }
}
globalThis.Date = DemoDate;
