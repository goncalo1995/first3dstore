'use client'

import { useState } from 'react'
import { ExternalLink, Mail, Phone, Plus, Trash2, Building2, Truck, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, id } from '@/lib/db'
import { toast } from 'sonner'
import { format } from 'date-fns'

import type { PrintFarm, ProductionJob, GlobalColor } from '@/types'

interface OutsourcedManagerProps {
  farms: PrintFarm[]
  jobs: ProductionJob[]
  colors: GlobalColor[]
}

export function OutsourcedManager({ farms, jobs, colors }: OutsourcedManagerProps) {
  const [isAddingFarm, setIsAddingFarm] = useState(false)
  const [newFarm, setNewFarm] = useState({ name: '', contactEmail: '', website: '' })

  const outsourcedJobs = jobs.filter((j: any) => j.outsourced)

  const handleCreateFarm = async () => {
    if (!newFarm.name) return
    try {
      await db.transact(
        db.tx.printFarms[id()].update({
          ...newFarm,
          colorsOffered: [],
          updatedAt: new Date()
        })
      )
      setIsAddingFarm(false)
      setNewFarm({ name: '', contactEmail: '', website: '' })
      toast.success('Print farm added')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDeleteFarm = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      await db.transact(db.tx.printFarms[id].delete())
      toast.success('Farm removed')
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">External Production</h2>
            <p className="text-sm text-muted-foreground">Manage outsourced print farms and active job tracking.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {outsourcedJobs.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No active outsourced jobs</p>
            </div>
          ) : (
            outsourcedJobs.map((job: any) => (
              <Card key={job.id} className="overflow-hidden border-muted/50 shadow-sm group hover:border-amber-200 transition-all">
                <div className="flex flex-wrap md:flex-nowrap items-center gap-6 p-5">
                  <div className="h-12 w-12 rounded-xl border-2 shadow-sm ring-4 ring-muted/10 flex-shrink-0" style={{ backgroundColor: job.colorHex }} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[9px] h-4 uppercase">OUTSOURCED</Badge>
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ORD #{job.orderId.slice(0,6)}</span>
                    </div>
                    <h4 className="font-black text-sm tracking-tight">{job.productName}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{job.partLabel} • {job.quantity}x Units</p>
                  </div>

                  <div className="flex items-center gap-10">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Assigned Farm</p>
                       <p className="text-sm font-black flex items-center gap-2 justify-end">
                         <Building2 className="h-3.5 w-3.5 text-primary" />
                         {farms.find((f: any) => f.id === job.assignedFarmId)?.name || 'Pending Assignment'}
                       </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="sm" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest shadow-sm">
                         Update Status
                       </Button>
                       <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-primary">
                         <Mail className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Partner Networks</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAddingFarm(!isAddingFarm)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isAddingFarm && (
          <Card className="border-primary/20 shadow-xl bg-primary/5">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest">Farm Name</Label>
                <Input value={newFarm.name} onChange={e => setNewFarm(p => ({ ...p, name: e.target.value }))} className="h-9 font-bold" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest">Contact Email</Label>
                <Input value={newFarm.contactEmail} onChange={e => setNewFarm(p => ({ ...p, contactEmail: e.target.value }))} className="h-9" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1 font-black text-[10px] uppercase tracking-widest" onClick={handleCreateFarm}>Add Partner</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingFarm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {farms.map((farm: any) => (
            <Card key={farm.id} className="border-muted/50 shadow-sm overflow-hidden group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                       <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-black text-sm tracking-tight">{farm.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDeleteFarm(farm.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Mail className="h-3 w-3" /> {farm.contactEmail || 'No email set'}
                  </div>
                  {farm.website && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <ExternalLink className="h-3 w-3" /> {farm.website}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Active Jobs</span>
                   <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px] font-black">
                     {outsourcedJobs.filter((j: any) => j.assignedFarmId === farm.id).length}
                   </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
