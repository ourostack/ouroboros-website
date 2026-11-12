import { useEffect, useRef, useState, type JSX } from "react";
import { CodeBlock } from "@/components/ouro/code-block/code-block";
import { SegmentedControl } from "@/components/ouro/segmented-control/segmented-control";

// One command in two shells (macOS, Linux and WSL share theirs), drawn with Ouro HX's SegmentedControl and
// CodeBlock. The reader picks a shell once and every switcher on the page
// follows; the choice is saved under KEY. Without JavaScript every variant
// shows under its own caption and the control stays hidden (the page's CSS
// keys both off html[data-shell-active], which an inline script sets early).
const KEY = "ouroboros-agent-loop-shell";
const SHELLS = [
  { value: "mac", label: "macOS / Linux / WSL", title: "macOS, Linux or WSL terminal" },
  { value: "powershell", label: "PowerShell", title: "Windows PowerShell" },
] as const;
type Shell = (typeof SHELLS)[number]["value"];

interface Props {
  mac: string;
  powershell: string;
}

function isShell(value: string | null | undefined): value is Shell {
  return SHELLS.some((shell) => shell.value === value);
}

export default function ShellCommands({ mac, powershell }: Props): JSX.Element {
  const code: Record<Shell, string> = { mac, powershell };
  const [shell, setShell] = useState<Shell>("mac");
  const [hydrated, setHydrated] = useState(false);
  const control = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = document.documentElement.dataset.shellActive;
    if (isShell(active)) setShell(active);
    setHydrated(true);
    const follow = (next: string | null | undefined) => {
      if (isShell(next)) setShell(next);
    };
    const onChoose = (event: Event) => follow((event as CustomEvent<string>).detail);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY || !isShell(event.newValue)) return;
      document.documentElement.dataset.shellActive = event.newValue;
      follow(event.newValue);
    };
    window.addEventListener(KEY, onChoose);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(KEY, onChoose);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Keep this control where it was while switchers above it change height.
  function choose(next: string) {
    if (!isShell(next)) return;
    const before = control.current?.getBoundingClientRect().top ?? 0;
    document.documentElement.dataset.shellActive = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    window.dispatchEvent(new CustomEvent(KEY, { detail: next }));
    window.scrollBy(0, (control.current?.getBoundingClientRect().top ?? 0) - before);
  }

  return (
    <div className="shell-commands">
      <div ref={control} className="shell-control" data-shell-control="" data-hydrated={hydrated ? "" : undefined}>
        <SegmentedControl
          label="Your terminal"
          items={SHELLS.map(({ value, label }) => ({ value, label }))}
          value={shell}
          onValueChange={choose}
        />
      </div>
      {SHELLS.map(({ value, title }) => (
        <div key={value} className="shell-variant" data-shell-variant={value}>
          <CodeBlock code={code[value]} language="shell" title={title} wrap />
        </div>
      ))}
    </div>
  );
}
