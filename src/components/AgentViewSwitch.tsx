import { useEffect, useState, type JSX } from 'react'
import { Switch } from './ouro/switch/switch'

/**
 * The home page's Agent view switch (Ouro HX's Switch). It asks the page to
 * flip with an `agent-view` event; AgentView.astro does the flipping and
 * answers with `agent-view:state`, so the switch shows what the page shows.
 */
export default function AgentViewSwitch(): JSX.Element {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const sync = (event: Event) => setOn((event as CustomEvent<boolean>).detail)
    document.addEventListener('agent-view:state', sync)
    return () => document.removeEventListener('agent-view:state', sync)
  }, [])
  return (
    <Switch
      label="Agent view"
      checked={on}
      onCheckedChange={(next) => {
        setOn(next)
        document.dispatchEvent(new CustomEvent('agent-view', { detail: next }))
      }}
    />
  )
}
