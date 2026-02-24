"use client"

import * as React from 'react'
import { useAppContext } from '@/contexts/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Settings,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Key,
  Target,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  ShieldCheck,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

interface ClientFormData {
  name: string
  meta_account_id: string
  google_account_id: string
  shopify_store_url: string
  target_mer: string
  target_contribution_margin_pct: string
  monthly_spend_target: string
  monthly_revenue_target: string
  cogs_pct: string
}

const initialFormData: ClientFormData = {
  name: '',
  meta_account_id: '',
  google_account_id: '',
  shopify_store_url: '',
  target_mer: '3.5',
  target_contribution_margin_pct: '35',
  monthly_spend_target: '',
  monthly_revenue_target: '',
  cogs_pct: '45',
}

type Platform = 'northbeam' | 'triple_whale' | 'shopify'

interface PlatformConfig {
  key: Platform
  name: string
  icon: string
  color: string
  bgColor: string
  placeholder: string
  needsStore?: boolean
  needsNorthbeamClientId?: boolean
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: 'northbeam',
    name: 'Northbeam',
    icon: 'N',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    placeholder: 'Your Northbeam API key',
    needsNorthbeamClientId: true,
  },
  {
    key: 'triple_whale',
    name: 'Triple Whale',
    icon: 'TW',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    placeholder: 'tw_...',
  },
  {
    key: 'shopify',
    name: 'Shopify',
    icon: 'S',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    placeholder: 'shpat_...',
    needsStore: true,
  },
]

// ── Connection Status Component ──────────────────────────────

function ConnectionStatus({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <div className="flex items-center gap-1 text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs">Connected</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-zinc-500">
      <XCircle className="h-4 w-4" />
      <span className="text-xs">Not set</span>
    </div>
  )
}

// ── Credential Card Component ────────────────────────────────

function CredentialCard({
  platform,
  clientId,
  isConnected,
  shopifyStore,
  northbeamClientId: initialNbClientId,
  onSaved,
}: {
  platform: PlatformConfig
  clientId: string
  isConnected: boolean
  shopifyStore?: string
  northbeamClientId?: string
  onSaved: () => void
}) {
  const [apiKey, setApiKey] = React.useState('')
  const [storeUrl, setStoreUrl] = React.useState(shopifyStore || '')
  const [nbClientId, setNbClientId] = React.useState(initialNbClientId || '')
  const [showKey, setShowKey] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{ valid: boolean; error?: string } | null>(null)

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  const handleTest = async () => {
    if (!apiKey) return
    if (platform.needsNorthbeamClientId && !nbClientId) {
      setTestResult({ valid: false, error: 'Data-Client-ID is required' })
      return
    }
    setTesting(true)
    setTestResult(null)

    try {
      const body: Record<string, unknown> = { platform: platform.key, key: apiKey }
      const config: Record<string, string> = {}
      if (platform.needsStore) config.store = storeUrl
      if (platform.needsNorthbeamClientId) config.northbeam_client_id = nbClientId
      if (Object.keys(config).length > 0) body.config = config

      const res = await fetch(`${basePath}/api/credentials/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ valid: false, error: 'Failed to connect to validation service' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey) return
    if (platform.needsNorthbeamClientId && !nbClientId) return
    setSaving(true)

    try {
      const body: Record<string, unknown> = { platform: platform.key, key: apiKey }
      if (platform.needsStore) body.store = storeUrl
      if (platform.needsNorthbeamClientId) body.northbeam_client_id = nbClientId

      const res = await fetch(`${basePath}/api/clients/${clientId}/credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setApiKey('')
        setTestResult(null)
        onSaved()
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${platform.name}? This will remove the stored API key.`)) return

    try {
      await fetch(`${basePath}/api/clients/${clientId}/credentials?platform=${platform.key}`, {
        method: 'DELETE',
      })
      onSaved()
    } catch {
      // silently fail
    }
  }

  return (
    <div className="p-4 bg-zinc-800 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platform.bgColor}`}>
            <span className={`text-sm font-bold ${platform.color}`}>{platform.icon}</span>
          </div>
          <div>
            <div className="font-medium text-white">{platform.name}</div>
            {isConnected ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> API key stored (encrypted)
              </span>
            ) : (
              <span className="text-xs text-zinc-500">No API key configured</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Connected
            </Badge>
          )}
          {isConnected && (
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs"
              onClick={handleDisconnect}>
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="space-y-2">
        {platform.needsNorthbeamClientId && (
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Data-Client-ID</Label>
            <Input
              value={nbClientId}
              onChange={(e) => { setNbClientId(e.target.value); setTestResult(null) }}
              placeholder={isConnected && initialNbClientId ? initialNbClientId : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
              className="bg-zinc-900 border-zinc-700 text-sm font-mono"
            />
            <p className="text-[10px] text-zinc-600">Found in Northbeam → Settings → API Keys</p>
          </div>
        )}
        {platform.needsStore && (
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">Store URL</Label>
            <Input
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="store-name.myshopify.com"
              className="bg-zinc-900 border-zinc-700 text-sm"
            />
          </div>
        )}
        <div className="space-y-1">
          {(platform.needsNorthbeamClientId || platform.needsStore) && (
            <Label className="text-xs text-zinc-400">API Key</Label>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
                placeholder={isConnected ? '••••••••••••••••' : platform.placeholder}
                className="bg-zinc-900 border-zinc-700 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={!apiKey || testing || (platform.needsNorthbeamClientId && !nbClientId)}
              className="whitespace-nowrap"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
              Test
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!apiKey || saving || (platform.needsNorthbeamClientId && !nbClientId)}
              className="whitespace-nowrap"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`text-xs px-3 py-2 rounded ${
            testResult.valid
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {testResult.valid ? 'Connection successful' : `Failed: ${testResult.error}`}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Settings Page ───────────────────────────────────────

export default function SettingsPage() {
  const { clients, selectedClientId, setSelectedClientId, refreshClients } = useAppContext()
  const [editingClient, setEditingClient] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<ClientFormData>(initialFormData)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  const handleEditClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      setFormData({
        name: client.name,
        meta_account_id: client.meta_account_id || '',
        google_account_id: client.google_account_id || '',
        shopify_store_url: client.shopify_store_url || '',
        target_mer: String(client.target_mer || '3.5'),
        target_contribution_margin_pct: String(client.target_contribution_margin_pct || '35'),
        monthly_spend_target: String((client as any).monthly_spend_target || ''),
        monthly_revenue_target: String((client as any).monthly_revenue_target || ''),
        cogs_pct: String((client as any).cogs_pct ? (client as any).cogs_pct * 100 : '45'),
      })
      setEditingClient(clientId)
      setSaveError(null)
    }
  }

  const handleSaveClient = async () => {
    setIsSaving(true)
    setSaveError(null)

    try {
      const payload = {
        ...formData,
        shopify_store: formData.shopify_store_url,
        monthly_spend_target: formData.monthly_spend_target ? parseFloat(formData.monthly_spend_target) : null,
        monthly_revenue_target: formData.monthly_revenue_target ? parseFloat(formData.monthly_revenue_target) : null,
        cogs_pct: formData.cogs_pct ? parseFloat(formData.cogs_pct) / 100 : 0.45,
      }
      if (editingClient) {
        const res = await fetch(`${basePath}/api/clients/${editingClient}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to update client')
        }
      } else {
        const res = await fetch(`${basePath}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create client')
        }
      }

      await refreshClients()
      setEditingClient(null)
      setIsAddDialogOpen(false)
      setFormData(initialFormData)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    try {
      const res = await fetch(`${basePath}/api/clients/${clientId}`, { method: 'DELETE' })
      if (res.ok) {
        await refreshClients()
        if (selectedClientId === clientId) {
          setSelectedClientId(clients[0]?.id || null)
        }
      }
    } catch {
      // Silently fail for demo mode
    }
  }

  const handleSaveTargets = async () => {
    if (!selectedClient) return
    setIsSaving(true)
    setSaveError(null)

    try {
      const merInput = document.getElementById('client_mer') as HTMLInputElement
      const marginInput = document.getElementById('client_margin') as HTMLInputElement

      const res = await fetch(`${basePath}/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedClient.name,
          meta_account_id: selectedClient.meta_account_id,
          google_account_id: selectedClient.google_account_id,
          shopify_store: selectedClient.shopify_store_url,
          target_mer: merInput?.value || selectedClient.target_mer,
          target_contribution_margin_pct: marginInput?.value || selectedClient.target_contribution_margin_pct,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update targets')
      }

      await refreshClients()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const clientForm = (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Client Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Acme Inc."
        />
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target_mer">Target MER</Label>
          <Input
            id="target_mer"
            type="number"
            step="0.1"
            value={formData.target_mer}
            onChange={(e) => setFormData((prev) => ({ ...prev, target_mer: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_margin">Target Contribution Margin %</Label>
          <Input
            id="target_margin"
            type="number"
            value={formData.target_contribution_margin_pct}
            onChange={(e) => setFormData((prev) => ({ ...prev, target_contribution_margin_pct: e.target.value }))}
          />
        </div>
      </div>
      <Separator />
      <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Pacing Goals</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monthly_spend_target">Monthly Spend Target ($)</Label>
          <Input
            id="monthly_spend_target"
            type="number"
            placeholder="e.g. 150000"
            value={formData.monthly_spend_target}
            onChange={(e) => setFormData((prev) => ({ ...prev, monthly_spend_target: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly_revenue_target">Monthly Revenue Target ($)</Label>
          <Input
            id="monthly_revenue_target"
            type="number"
            placeholder="e.g. 600000"
            value={formData.monthly_revenue_target}
            onChange={(e) => setFormData((prev) => ({ ...prev, monthly_revenue_target: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cogs_pct">COGS % (for contribution margin calc)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="cogs_pct"
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="e.g. 45"
            value={formData.cogs_pct}
            onChange={(e) => setFormData((prev) => ({ ...prev, cogs_pct: e.target.value }))}
            className="w-32"
          />
          <span className="text-zinc-400 text-sm">% of revenue is COGS</span>
        </div>
        <p className="text-xs text-zinc-500">Used to calculate contribution margin from Northbeam revenue</p>
      </div>
      {saveError && (
        <p className="text-sm text-red-400">{saveError}</p>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
          <Settings className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400">Manage clients, API credentials, and performance targets</p>
        </div>
      </div>

      {/* Client Management */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Clients
            </CardTitle>
            <CardDescription>
              Manage client accounts and their data source connections
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) {
              setFormData(initialFormData)
              setSaveError(null)
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Create a client, then configure their API connections below.
                </DialogDescription>
              </DialogHeader>
              {clientForm}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveClient} disabled={isSaving || !formData.name}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Client
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Client</TableHead>
                <TableHead className="text-zinc-400">Northbeam</TableHead>
                <TableHead className="text-zinc-400">Triple Whale</TableHead>
                <TableHead className="text-zinc-400">Shopify</TableHead>
                <TableHead className="text-zinc-400">Target MER</TableHead>
                <TableHead className="text-right text-zinc-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="border-zinc-800">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{client.name}</div>
                        {selectedClientId === client.id && (
                          <Badge variant="secondary" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ConnectionStatus connected={!!client.northbeam_api_key} />
                  </TableCell>
                  <TableCell>
                    <ConnectionStatus connected={!!(client as any).triple_whale_api_key} />
                  </TableCell>
                  <TableCell>
                    <ConnectionStatus connected={!!(client as any).shopify_token || !!client.shopify_store_url} />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-white">
                      {client.target_mer?.toFixed(1) || '—'}x
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClient(client.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={!!editingClient} onOpenChange={(open) => {
        if (!open) {
          setEditingClient(null)
          setFormData(initialFormData)
          setSaveError(null)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client details and performance targets
            </DialogDescription>
          </DialogHeader>
          {clientForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClient(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient} disabled={isSaving || !formData.name}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Data Source Connections */}
      {selectedClient && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
              <Key className="h-5 w-5" />
              Data Source Connections — {selectedClient.name}
            </CardTitle>
            <CardDescription>
              Connect data sources by entering API keys. Use the Test button to verify before saving.
              All keys are encrypted at rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PLATFORMS.map((platform) => (
              <CredentialCard
                key={platform.key}
                platform={platform}
                clientId={selectedClient.id}
                isConnected={
                  platform.key === 'northbeam' ? !!selectedClient.northbeam_api_key :
                  platform.key === 'triple_whale' ? !!(selectedClient as any).triple_whale_api_key :
                  platform.key === 'shopify' ? !!((selectedClient as any).shopify_token || selectedClient.shopify_store_url) :
                  false
                }
                shopifyStore={selectedClient.shopify_store_url || undefined}
                northbeamClientId={selectedClient.northbeam_client_id || undefined}
                onSaved={() => refreshClients()}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* MER Target Settings */}
      {selectedClient && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance Targets — {selectedClient.name}
            </CardTitle>
            <CardDescription>
              Set MER and contribution margin targets for pacing and goal tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client_mer">Target MER</Label>
                <div className="flex gap-2">
                  <Input
                    id="client_mer"
                    type="number"
                    step="0.1"
                    defaultValue={selectedClient.target_mer || 3.5}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  <span className="flex items-center text-zinc-400">x</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Marketing Efficiency Ratio target (Revenue / Ad Spend)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_margin">Contribution Margin %</Label>
                <div className="flex gap-2">
                  <Input
                    id="client_margin"
                    type="number"
                    defaultValue={selectedClient.target_contribution_margin_pct || 35}
                    className="bg-zinc-800 border-zinc-700"
                  />
                  <span className="flex items-center text-zinc-400">%</span>
                </div>
                <p className="text-xs text-zinc-500">
                  Gross margin percentage used for contribution calculation
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={handleSaveTargets} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
