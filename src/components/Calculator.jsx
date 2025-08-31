import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 14;

export default function Calculator() {
  const [current, setCurrent] = useState("0");        // what's on the screen
  const [prev, setPrev] = useState(null);             // previous value (number)
  const [op, setOp] = useState(null);                 // "+", "-", "×", "÷"
  const [lastOperand, setLastOperand] = useState(null);
  const [overwrite, setOverwrite] = useState(false);  // next digit overwrites screen
  const [error, setError] = useState(null);

  const displayRef = useRef(null);

  // ---------- helpers ----------
  const toNumber = (s) => Number(s.replace(/,$/, "."));
  const format = (n) => {
    if (!isFinite(n)) return "Error";
    // limit decimals and remove trailing zeros
    const str = n.toString();
    if (str.length <= MAX_LENGTH) return str;
    // Try fixed with up to 10 decimals first
    const fixed = Number(n.toFixed(10)).toString();
    if (fixed.length <= MAX_LENGTH) return fixed;
    // Fall back to scientific
    return n.toExponential(6);
  };

  const inputDigit = (d) => {
    if (error) return;
    setCurrent((c) => {
      if (overwrite) {
        setOverwrite(false);
        return d;
      }
      if (c === "0") return d;
      if (c.length >= MAX_LENGTH) return c;
      return c + d;
    });
  };

  const inputDecimal = () => {
    if (error) return;
    setCurrent((c) => {
      if (overwrite) {
        setOverwrite(false);
        return "0.";
      }
      if (c.includes(".")) return c;
      return c + ".";
    });
  };

  const clearAll = () => {
    setCurrent("0");
    setPrev(null);
    setOp(null);
    setLastOperand(null);
    setOverwrite(false);
    setError(null);
  };

  const backspace = () => {
    if (error) return;
    setCurrent((c) => {
      if (overwrite) return "0";
      if (c.length <= 1) return "0";
      if (c === "-0") return "0";
      const next = c.slice(0, -1);
      return next === "-" ? "0" : next;
    });
  };

  const chooseOperator = (nextOp) => {
    if (error) return;
    const currentNum = toNumber(current);
    if (prev === null) {
      setPrev(currentNum);
      setOp(nextOp);
      setOverwrite(true);
      return;
    }
    if (overwrite) {
      // Replace operator if user hits operators back-to-back
      setOp(nextOp);
      return;
    }
    // Evaluate with existing op, then store result and new op
    const result = evaluate(prev, currentNum, op);
    if (result === "DIV0") {
      setError("Cannot divide by 0");
      setOp(null);
      setPrev(null);
      setCurrent("0");
      setOverwrite(true);
      return;
    }
    setPrev(result);
    setCurrent(format(result));
    setOp(nextOp);
    setOverwrite(true);
  };

  const equals = () => {
    if (error) return;
    if (op === null) {
      // Repeat last operation if available: 5 + 2 = = -> 9
      if (lastOperand != null && prev != null) {
        const result = evaluate(toNumber(current), lastOperand, "+0"); // handled below
        setCurrent(format(result));
        setOverwrite(true);
      }
      return;
    }
    const a = prev ?? 0;
    const b = toNumber(current);
    const result = evaluate(a, b, op);
    if (result === "DIV0") {
      setError("Cannot divide by 0");
      setOp(null);
      setPrev(null);
      setCurrent("0");
      setOverwrite(true);
      return;
    }
    setCurrent(format(result));
    setPrev(result);
    setLastOperand(b);
    setOp(null);
    setOverwrite(true);
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
      // special helper for repeated equals (noop + 0)
      case "+0": return a + b;
      default: return b;
    }
  }

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e) => {
      const { key } = e;
      if (/^\d$/.test(key)) {
        e.preventDefault();
        inputDigit(key);
      } else if (key === ".") {
        e.preventDefault();
        inputDecimal();
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        equals();
      } else if (key === "Escape") {
        e.preventDefault();
        clearAll();
      } else if (key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (["+","-","*","/"].includes(key)) {
        e.preventDefault();
        const mapped = key === "*" ? "×" : key === "/" ? "÷" : key === "-" ? "−" : "+";
        chooseOperator(mapped);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prev, op, current, error, overwrite]);

  // Focus outline for accessibility when display updates
  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.setAttribute("aria-live", "polite");
    }
  }, [current, error]);

  // ---------- UI ----------
  const Key = ({ children, onClick, className = "", label }) => (
    <Button
      variant="secondary"
      className={`text-xl py-6 rounded-2xl ${className}`}
      onClick={onClick}
      aria-label={label || String(children)}
    >
      {children}
    </Button>
  );

  return (
    <div className="w-full min-h-[60vh] grid place-items-center p-4">
      <Card className="w-full max-w-sm shadow-lg rounded-2xl">
        <CardContent className="p-4">
          {/* Display */}
          <div
            ref={displayRef}
            role="status"
            className="mb-3 h-16 w-full flex items-end justify-end rounded-xl bg-muted px-3 text-3xl font-semibold tabular-nums overflow-hidden"
          >
            <span className="truncate">
              {error ? error : current}
            </span>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2">
            <Key className="bg-destructive/10 hover:bg-destructive/20" onClick={clearAll} label="Clear">C</Key>
            <Key onClick={backspace} label="Backspace">⌫</Key>
            <Key onClick={() => chooseOperator("÷")} label="Divide">÷</Key>
            <Key onClick={() => chooseOperator("×")} label="Multiply">×</Key>

            <Key onClick={() => inputDigit("7")}>7</Key>
            <Key onClick={() => inputDigit("8")}>8</Key>
            <Key onClick={() => inputDigit("9")}>9</Key>
            <Key onClick={() => chooseOperator("−")} label="Subtract">−</Key>

            <Key onClick={() => inputDigit("4")}>4</Key>
            <Key onClick={() => inputDigit("5")}>5</Key>
            <Key onClick={() => inputDigit("6")}>6</Key>
            <Key onClick={() => chooseOperator("+")} label="Add">+</Key>

            <Key className="col-span-2" onClick={() => inputDigit("1")}>1</Key>
            <Key onClick={() => inputDigit("2")}>2</Key>
            <Key onClick={() => inputDigit("3")}>3</Key>

            <Key className="col-span-2" onClick={() => inputDigit("0")}>0</Key>
            <Key onClick={inputDecimal} label="Decimal">.</Key>
            <Key className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={equals} label="Equals">=</Key>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
