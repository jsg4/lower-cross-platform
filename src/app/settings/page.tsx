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
  Link,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { demoClients } from '@/lib/seed'

interface ClientFormData {
  name: string
  meta_account_id: string
  google_account_id: string
  northbeam_api_key: string
  shopify_store_url: string
  target_mer: string
  target_contribution_margin_pct: string
}

const initialFormData: ClientFormData = {
  name: '',
  meta_account_id: '',
  google_account_id: '',
  northbeam_api_key: '',
  shopify_store_url: '',
  target_mer: '3.5',
  target_contribution_margin_pct: '35',
}

export default function SettingsPage() {
  const { selectedClientId, setSelectedClientId } = useAppContext()
  const [clients, setClients] = React.useState(demoClients)
  const [editingClient, setEditingClient] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<ClientFormData>(initialFormData)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)

  const handleEditClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      setFormData({
        name: client.name,
        meta_account_id: client.meta_account_id || '',
        google_account_id: client.google_account_id || '',
        northbeam_api_key: client.northbeam_api_key || '',
        shopify_store_url: client.shopify_store_url || '',
        target_mer: String(client.target_mer || '3.5'),
        target_contribution_margin_pct: String(client.target_contribution_margin_pct || '35'),
      })
      setEditingClient(clientId)
    }
  }

  const handleSaveClient = () => {
    // In production, this would make an API call
    console.log('Saving client:', formData)
    setEditingClient(null)
    setIsAddDialogOpen(false)
    setFormData(initialFormData)
  }

  const handleDeleteClient = (clientId: string) => {
    // In production, this would make an API call
    if (confirm('Are you sure you want to delete this client?')) {
      setClients((prev) => prev.filter((c) => c.id !== clientId))
      if (selectedClientId === clientId) {
        setSelectedClientId(clients[0]?.id || null)
      }
    }
  }

  const maskApiKey = (key: string | null) => {
    if (!key) return '—'
    return `${key.slice(0, 4)}${'•'.repeat(12)}${key.slice(-4)}`
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
          <Settings className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400">Manage clients and API credentials</p>
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
              Manage client accounts and their API connections
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                  Enter client details and API credentials
                </DialogDescription>
              </DialogHeader>
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
                    <Label htmlFor="target_margin">Contribution Margin %</Label>
                    <Input
                      id="target_margin"
                      type="number"
                      value={formData.target_contribution_margin_pct}
                      onChange={(e) => setFormData((prev) => ({ ...prev, target_contribution_margin_pct: e.target.value }))}
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="meta">Meta Account ID</Label>
                  <Input
                    id="meta"
                    value={formData.meta_account_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_account_id: e.target.value }))}
                    placeholder="act_123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google">Google Customer ID</Label>
                  <Input
                    id="google"
                    value={formData.google_account_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, google_account_id: e.target.value }))}
                    placeholder="1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="northbeam">Northbeam API Key</Label>
                  <Input
                    id="northbeam"
                    type="password"
                    value={formData.northbeam_api_key}
                    onChange={(e) => setFormData((prev) => ({ ...prev, northbeam_api_key: e.target.value }))}
                    placeholder="nb_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopify">Shopify Store URL</Label>
                  <Input
                    id="shopify"
                    value={formData.shopify_store_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, shopify_store_url: e.target.value }))}
                    placeholder="https://store.myshopify.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveClient}>Add Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Client</TableHead>
                <TableHead className="text-zinc-400">Meta</TableHead>
                <TableHead className="text-zinc-400">Google</TableHead>
                <TableHead className="text-zinc-400">Northbeam</TableHead>
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
                    {client.meta_account_id ? (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-zinc-500">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs">Not set</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.google_account_id ? (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-zinc-500">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs">Not set</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.northbeam_api_key ? (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-zinc-500">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs">Not set</span>
                      </div>
                    )}
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

      {/* API Credentials for Selected Client */}
      {selectedClient && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Credentials — {selectedClient.name}
            </CardTitle>
            <CardDescription>
              Configure data source connections for this client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meta */}
            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <span className="text-lg font-bold text-blue-400">M</span>
                </div>
                <div>
                  <div className="font-medium text-white">Meta Marketing API</div>
                  <div className="text-sm text-zinc-400">
                    Account ID: {selectedClient.meta_account_id || 'Not configured'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedClient.meta_account_id && (
                  <Badge variant="success">Connected</Badge>
                )}
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>

            {/* Google */}
            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                  <span className="text-lg font-bold text-emerald-400">G</span>
                </div>
                <div>
                  <div className="font-medium text-white">Google Ads API</div>
                  <div className="text-sm text-zinc-400">
                    Customer ID: {selectedClient.google_account_id || 'Not configured'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedClient.google_account_id && (
                  <Badge variant="success">Connected</Badge>
                )}
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>

            {/* Northbeam */}
            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <span className="text-lg font-bold text-purple-400">N</span>
                </div>
                <div>
                  <div className="font-medium text-white">Northbeam API</div>
                  <div className="text-sm text-zinc-400">
                    API Key: {maskApiKey(selectedClient.northbeam_api_key)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedClient.northbeam_api_key && (
                  <Badge variant="success">Connected</Badge>
                )}
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>
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
              Set MER and contribution margin targets
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
                  Marketing Efficiency Ratio target (Revenue ÷ Ad Spend)
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
              <Button>Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
