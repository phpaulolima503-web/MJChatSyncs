import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import Link from 'next/link'
import { Plus, Zap, Play, Pause, GitBranch, Clock, CheckCircle2, LayoutGrid } from 'lucide-react'

export const metadata: Metadata = { title: 'Workflows | WaCRM', description: 'Automation workflows' }

export default async function WorkflowsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = supabaseAdmin()
  const { data: workflows } = await db.from('workflows').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
  const { data: execStats } = await db.from('workflow_executions').select('workflow_id, status').eq('user_id', user.id).gte('created_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
  const { count: pendingCount } = await db.from('workflow_approvals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending')

  const wfs = workflows ?? []
  const execMap = (execStats ?? []).reduce((acc: Record<string, { total: number; success: number }>, e) => {
    if (!acc[e.workflow_id]) acc[e.workflow_id] = { total: 0, success: 0 }
    acc[e.workflow_id].total++
    if (e.status === 'success') acc[e.workflow_id].success++
    return acc
  }, {})

  const STATUS_COLORS: Record<string, string> = {
    published: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    draft: 'text-muted-foreground bg-muted/70 border-border',
    archived: 'text-red-400 bg-red-500/10 border-red-500/30',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflow Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate your entire CRM with AI-powered workflows</p>
        </div>
        <div className="flex gap-2">
          <Link href="/workflows/templates" className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:border-border hover:text-foreground transition-colors">
            <LayoutGrid className="h-4 w-4" /> Templates
          </Link>
          <Link href="/workflows/new" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> New Workflow
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Workflows', value: wfs.length, icon: Zap, color: 'text-violet-400' },
          { label: 'Active', value: wfs.filter(w => w.is_active).length, icon: Play, color: 'text-emerald-400' },
          { label: 'Executions (7d)', value: (execStats ?? []).length, icon: GitBranch, color: 'text-blue-400' },
          { label: 'Pending Approvals', value: pendingCount ?? 0, icon: CheckCircle2, color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Workflow List */}
      {wfs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/70 p-16 text-center">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-muted-foreground">No workflows yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create your first workflow or import a template</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/workflows/templates" className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Browse Templates</Link>
            <Link href="/workflows/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/90 transition-colors">Create Workflow</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {wfs.map(wf => {
            const stats = execMap[wf.id] ?? { total: 0, success: 0 }
            const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : null
            return (
              <Link key={wf.id} href={`/workflows/${wf.id}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-border transition-all group">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-foreground transition-colors">{wf.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{wf.description ?? `Trigger: ${wf.trigger_type?.replace(/_/g,' ')}`}</p>
                </div>
                <div className="hidden items-center gap-4 lg:flex text-xs text-muted-foreground">
                  <span className="capitalize">{wf.category}</span>
                  {successRate !== null && <span>{successRate}% success</span>}
                  <span>{stats.total} runs</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[wf.status] ?? STATUS_COLORS.draft}`}>
                  {wf.status}
                </span>
                {wf.is_active ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4 text-muted-foreground" />}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
