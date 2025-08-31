import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MAX_LEN = 16;

export default function ScientificCalculator() {
  // --- core calc state ---
  const [display, setDisplay] = useState("0");         // main screen (string)
  const [prev, setPrev] = useState(null);              // previous numeric value
  const [op, setOp] = useState(null);                  // current binary operator
  const [lastOperand, setLastOperand] = useState(null);// for repeated equals
  const [overwrite, setOverwrite] = useState(false);   // next digit replaces screen
  const [error, setError] = useState(null);            // error message or null
  const [history, setHistory] = useState("");          // tiny expression preview

  // --- scientific state ---
  const [angleMode, setAngleMode] = useState("DEG");   // "DEG" | "RAD"
  const [inverse, setInverse] = useState(false);       // INV toggle
  const [memory, setMemory] = useState(null);          // MC/MR/M+/M-/MS
  const [enteringExp, setEnteringExp] = useState(false);// if user pressed "Exp"

  const screenRef = useRef(null);

  // ---------- helpers ----------
  const toNumber = (s) => {
    // Normalize stray commas and spaces
    const clean = String(s).replaceAll(",", "").trim();
    // Allow "E" scientific string (e.g., 1.23E-4) — Number() already supports it
    const n = Number(clean);
    return n;
  };

  const fmt = (n) => {
    if (!isFinite(n)) return "Error";
    // Prefer up to MAX_LEN significant digits, trim trailing zeros
    let s = n.toString();
    if (s.length <= MAX_LEN) return s;
    // Try fixed with 12 decimals then trim
    s = Number(n.toFixed(12)).toString();
    if (s.length <= MAX_LEN) return s;
    // Fall back to scientific
    return n.toExponential(8).replace("+", "");
  };

  const commitResult = (value, labelAfter = "") => {
    if (value === "DIV0" || value === "DOMAIN" || value === "OVERFLOW") {
      setError(errorMessage(value));
      setDisplay("0");
      setPrev(null);
      setOp(null);
      setOverwrite(true);
      setHistory("");
      return;
    }
    setDisplay(fmt(value));
    setOverwrite(true);
    if (labelAfter) setHistory(labelAfter);
  };

  const errorMessage = (code) => {
    switch (code) {
      case "DIV0": return "Cannot divide by 0";
      case "DOMAIN": return "Math domain error";
      case "OVERFLOW": return "Overflow";
      default: return "Error";
    }
  };

  const deg2rad = (x) => x * (Math.PI / 180);
  const rad2deg = (x) => x * (180 / Math.PI);
  const inAngle = (x) => (angleMode === "DEG" ? deg2rad(x) : x);
  const outAngle = (x) => (angleMode === "DEG" ? rad2deg(x) : x);

  // ---------- input ----------
  const inputDigit = (d) => {
    if (error) return;
    setDisplay((s) => {
      if (overwrite) {
        setOverwrite(false);
        setEnteringExp(false);
        return d;
      }
      if (s === "0") return d;
      if (s.length >= MAX_LEN) return s;
      return s + d;
    });
  };

  const inputDot = () => {
    if (error) return;
    setDisplay((s) => {
      if (overwrite) {
        setOverwrite(false);
        setEnteringExp(false);
        return "0.";
      }
      // If we're entering exponent, let user put sign but not a second dot before/after E
      if (s.includes("E")) {
        const [mantissa, exponent = ""] = s.split("E");
        if (!mantissa.includes(".")) {
          return `${mantissa}.${exponent ? "E" + exponent : ""}`;
        }
        return s;
      }
      if (s.includes(".")) return s;
      return s + ".";
    });
  };

  const toggleSign = () => {
    if (error) return;
    setDisplay((s) => {
      if (s.startsWith("-")) return s.slice(1);
      if (s === "0") return "0";
      return "-" + s;
    });
  };

  const clearAll = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setLastOperand(null);
    setOverwrite(false);
    setError(null);
    setHistory("");
    setEnteringExp(false);
  };

  const backspace = () => {
    if (error) return;
    setDisplay((s) => {
      if (overwrite) return "0";
      if (s.length <= 1 || (s.length === 2 && s.startsWith("-"))) return "0";
      return s.slice(0, -1);
    });
  };

  const insertConstant = (c) => {
    if (error) return;
    const val = c === "PI" ? Math.PI : Math.E;
    setDisplay(fmt(val));
    setOverwrite(true);
  };

  const pressExp = () => {
    if (error) return;
    setDisplay((s) => {
      if (s.includes("E")) return s;
      if (overwrite || s === "0") {
        setOverwrite(false);
        setEnteringExp(true);
        return "1E";
      }
      setEnteringExp(true);
      return s + "E";
    });
  };

  // ---------- binary operators ----------
  const chooseOp = (nextOp, label) => {
    if (error) return;
    const cur = toNumber(display);
    if (prev === null) {
      setPrev(cur);
      setOp(nextOp);
      setOverwrite(true);
      setHistory(`${fmt(cur)} ${label}`);
      return;
    }
    if (overwrite) {
      // Replace operator if user taps two ops consecutively
      setOp(nextOp);
      setHistory((h) => h.replace(/[\+\-×÷\^]$/, label));
      return;
    }
    const r = evaluate(prev, cur, op);
    if (typeof r === "string") return commitResult(r);
    setPrev(r);
    setDisplay(fmt(r));
    setOp(nextOp);
    setOverwrite(true);
    setHistory(`${fmt(r)} ${label}`);
  };

  const equals = () => {
    if (error) return;
    if (op === null) {
      // Repeat last operation: a (op) b = = ...
      if (lastOperand != null) {
        const r = evaluate(toNumber(display), lastOperand, "+0");
        if (typeof r === "string") return commitResult(r);
        setDisplay(fmt(r));
        setOverwrite(true);
        return;
      }
      return;
    }
    const a = prev ?? 0;
    const b = toNumber(display);
    const r = evaluate(a, b, op);
    if (typeof r === "string") return commitResult(r);
    setDisplay(fmt(r));
    setPrev(r);
    setLastOperand(b);
    setOp(null);
    setOverwrite(true);
    setHistory("");
  };

  function evaluate(a, b, operator) {
    switch (operator) {
      case "+": return a + b;
      case "−":
      case "-": return a - b;
      case "×":
      case "*": return a * b;
      case "÷":
      case "/": return b === 0 ? "DIV0" : a / b;
      case "^": {
        const out = Math.pow(a, b);
        if (!isFinite(out)) return "OVERFLOW";
        return out;
      }
      // helper for repeated equals
      case "+0": return a + b;
      default: return b;
    }
  }

  // ---------- unary scientific ops (act on current display) ----------
  const applyUnary = (fnName) => {
    if (error) return;
    const x = toNumber(display);

    const out = (() => {
      switch (fnName) {
        case "square": return x * x;
        case "cube": return x * x * x;
        case "sqrt":  return x < 0 ? "DOMAIN" : Math.sqrt(x);
        case "cbrt":  return Math.cbrt(x);
        case "recip": return x === 0 ? "DIV0" : 1 / x;
        case "abs":   return Math.abs(x);
        case "percent": {
          // Operand percentage (of prev): turns x into prev*(x/100) if prev+op exists,
          // else divide by 100
          if (prev != null && op != null) return prev * (x / 100);
          return x / 100;
        }
        case "fact": {
          if (!Number.isFinite(x) || x < 0 || !Number.isInteger(x)) return "DOMAIN";
          if (x > 170) return "OVERFLOW"; // 171! -> Infinity in JS
          let r = 1;
          for (let i = 2; i <= x; i++) r *= i;
          return r;
        }
        case "exp":   return Math.exp(x);
        case "exp10": return Math.pow(10, x);
        case "ln":    return x <= 0 ? "DOMAIN" : Math.log(x);
        case "log10": return x <= 0 ? "DOMAIN" : Math.log10(x);
        case "sin":   return Math.sin(inAngle(x));
        case "cos":   return Math.cos(inAngle(x));
        case "tan": {
          const val = Math.tan(inAngle(x));
          if (!isFinite(val)) return "DOMAIN";
          return val;
        }
        case "asin": {
          if (x < -1 || x > 1) return "DOMAIN";
          return outAngle(Math.asin(x));
        }
        case "acos": {
          if (x < -1 || x > 1) return "DOMAIN";
          return outAngle(Math.acos(x));
        }
        case "atan":  return outAngle(Math.atan(x));
        default: return x;
      }
    })();

    if (typeof out === "string") return commitResult(out);
    commitResult(out);
  };

  // ---------- memory ----------
  const memClear = () => setMemory(null);
  const memRecall = () => {
    if (memory == null) return;
    setDisplay(fmt(memory));
    setOverwrite(true);
  };
  const memStore = () => setMemory(toNumber(display));
  const memPlus  = () => setMemory((m) => (m ?? 0) + toNumber(display));
  const memMinus = () => setMemory((m) => (m ?? 0) - toNumber(display));

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key;

      // digits
      if (/^\d$/.test(k)) { e.preventDefault(); return inputDigit(k); }

      // numeric editing
      if (k === ".") { e.preventDefault(); return inputDot(); }
      if (k === "Backspace") { e.preventDefault(); return backspace(); }
      if (k === "Escape") { e.preventDefault(); return clearAll(); }
      if (k === "Enter" || k === "=") { e.preventDefault(); return equals(); }
      if (k.toLowerCase() === "e") { e.preventDefault(); return insertConstant("E"); }

      // constants and toggles
      if (k.toLowerCase() === "p") { e.preventDefault(); return insertConstant("PI"); }
      if (k.toLowerCase() === "r") { e.preventDefault(); return setAngleMode((m) => (m === "DEG" ? "RAD" : "DEG")); }
      if (k.toLowerCase() === "i") { e.preventDefault(); return setInverse((v) => !v); }
      if (k === "!") { e.preventDefault(); return applyUnary("fact"); }
      if (k.toLowerCase() === "l") { e.preventDefault(); return applyUnary("ln"); }
      if (k.toLowerCase() === "g") { e.preventDefault(); return applyUnary("log10"); }
      if (k.toLowerCase() === "s") { e.preventDefault(); return applyUnary(inverse ? "asin" : "sin"); }
      if (k.toLowerCase() === "c") { e.preventDefault(); return applyUnary(inverse ? "acos" : "cos"); }
      if (k.toLowerCase() === "t") { e.preventDefault(); return applyUnary(inverse ? "atan" : "tan"); }
      if (k === "%") { e.preventDefault(); return applyUnary("percent"); }
      if (k === "^") { e.preventDefault(); return chooseOp("^", "^"); }

      // basic ops
      if (["+","-","*","/"].includes(k)) {
        e.preventDefault();
        const mapped = k === "*" ? "×" : k === "/" ? "÷" : k === "-" ? "−" : "+";
        return chooseOp(mapped === "×" ? "*" : mapped === "÷" ? "/" : mapped === "−" ? "-" : "+", mapped);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, prev, op, inverse, angleMode, error]);

  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.setAttribute("aria-live", "polite");
    }
  }, [display, error, history]);

  // ---------- UI helpers ----------
  const Key = ({ children, onClick, className = "", label, variant = "secondary" }) => (
    <Button
      variant={variant}
      className={`text-base sm:text-lg py-5 rounded-2xl ${className}`}
      onClick={onClick}
      aria-label={label || String(children)}
    >
      {children}
    </Button>
  );

  // ---------- render ----------
  return (
    <div className="w-full grid place-items-center p-4">
      <Card className="w-full max-w-md sm:max-w-lg rounded-2xl shadow-lg">
        <CardContent className="p-4 sm:p-5">
          {/* Header / Toggles */}
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setAngleMode((m) => (m === "DEG" ? "RAD" : "DEG"))}
              aria-label="Toggle angle mode"
            >
              {angleMode}
            </Button>
            <Button
              variant={inverse ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setInverse((v) => !v)}
              aria-label="Toggle inverse functions"
            >
              INV
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={memClear} aria-label="Memory clear">MC</Button>
              <Button variant="outline" className="rounded-xl" onClick={memRecall} aria-label="Memory recall">MR</Button>
              <Button variant="outline" className="rounded-xl" onClick={memPlus} aria-label="Memory add">M+</Button>
              <Button variant="outline" className="rounded-xl" onClick={memMinus} aria-label="Memory subtract">M−</Button>
              <Button variant="outline" className="rounded-xl" onClick={memStore} aria-label="Memory store">MS</Button>
            </div>
          </div>

          {/* Expression preview + display */}
          <div className="mb-1 h-5 text-right text-xs text-muted-foreground truncate">{history}</div>
          <div
            ref={screenRef}
            role="status"
            className="mb-3 h-16 sm:h-20 w-full flex items-end justify-end rounded-xl bg-muted px-3 text-3xl sm:text-4xl font-semibold tabular-nums overflow-hidden"
          >
            <span className="truncate">{error ? error : display}</span>
          </div>

          {/* Scientific row */}
          <div className="grid grid-cols-5 gap-2 mb-2">
            <Key onClick={() => applyUnary(inverse ? "asin" : "sin")} label={inverse ? "arcsin" : "sine"}>{inverse ? "sin⁻¹" : "sin"}</Key>
            <Key onClick={() => applyUnary(inverse ? "acos" : "cos")} label={inverse ? "arccos" : "cosine"}>{inverse ? "cos⁻¹" : "cos"}</Key>
            <Key onClick={() => applyUnary(inverse ? "atan" : "tan")} label={inverse ? "arctan" : "tangent"}>{inverse ? "tan⁻¹" : "tan"}</Key>
            <Key onClick={() => applyUnary(inverse ? "exp" : "ln")} label={inverse ? "e^x" : "natural log"}>{inverse ? "eˣ" : "ln"}</Key>
            <Key onClick={() => applyUnary(inverse ? "exp10" : "log10")} label={inverse ? "10^x" : "log base 10"}>{inverse ? "10ˣ" : "log"}</Key>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-2">
            <Key onClick={() => applyUnary("square")} label="x squared">x²</Key>
            <Key onClick={() => applyUnary("sqrt")} label="square root">√</Key>
            <Key onClick={() => applyUnary("recip")} label="reciprocal">1/x</Key>
            <Key onClick={() => applyUnary("fact")} label="factorial">x!</Key>
            <Key onClick={() => applyUnary("abs")} label="absolute value">|x|</Key>
          </div>

          {/* Main keypad */}
          <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
            <Key onClick={() => insertConstant("PI")} label="pi">π</Key>
            <Key onClick={() => insertConstant("E")} label="Euler's number">e</Key>
            <Key onClick={() => applyUnary("percent")} label="percent">%</Key>
            <Key onClick={pressExp} label="scientific exponent">Exp</Key>
            <Key onClick={clearAll} className="bg-destructive/10 hover:bg-destructive/20" label="clear">C</Key>

            <Key onClick={() => inputDigit("7")}>7</Key>
            <Key onClick={() => inputDigit("8")}>8</Key>
            <Key onClick={() => inputDigit("9")}>9</Key>
            <Key onClick={backspace} label="backspace">⌫</Key>
            <Key onClick={() => chooseOp("/", "÷")} label="divide">÷</Key>

            <Key onClick={() => inputDigit("4")}>4</Key>
            <Key onClick={() => inputDigit("5")}>5</Key>
            <Key onClick={() => inputDigit("6")}>6</Key>
            <Key onClick={() => chooseOp("*", "×")} label="multiply">×</Key>
            <Key onClick={() => chooseOp("^", "^")} label="power">xʸ</Key>

            <Key onClick={() => inputDigit("1")}>1</Key>
            <Key onClick={() => inputDigit("2")}>2</Key>
            <Key onClick={() => inputDigit("3")}>3</Key>
            <Key onClick={() => chooseOp("-", "−")} label="subtract">−</Key>
            <Key onClick={toggleSign} label="toggle sign">±</Key>

            <Key className="col-span-2" onClick={() => inputDigit("0")}>0</Key>
            <Key onClick={inputDot} label="decimal">.</Key>
            <Key onClick={() => chooseOp("+", "+")} label="add">+</Key>
            <Key variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={equals} label="equals">=</Key>
          </div>

          {/* Memory indicator */}
          <div className="mt-2 h-4 text-right text-xs text-muted-foreground">
            {memory != null ? "M" : <span>&nbsp;</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
