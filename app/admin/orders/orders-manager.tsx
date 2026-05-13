'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Plus, Search, Pencil, Trash2, X, Hammer, Package, Truck, CheckCircle2, Clock, AlertCircle, RotateCcw, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { db, id } from '@/lib/db'
import type { OrderRecord } from '@/app/admin/types'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cancelJob, requeueJob } from '@/app/admin/production/actions'
import { toast } from 'sonner'
import { recheckStripeOrderPayment } from './actions'

type OrderItem = OrderRecord['items'][number]
type OrderItemStatus = NonNullable<OrderItem['itemStatus']>

const paymentLabels: Record<OrderRecord['paymentStatus'], string> = {
  pending: 'Payment pending',
  paid: 'Paid',
  refunded: 'Refunded',
}

const fulfillmentLabels: Record<OrderRecord['fulfillmentStatus'], string> = {
  new: 'New',
  printing: 'Printing',
  ready: 'Ready',
  ready_for_pickup: 'Ready for pickup',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const itemStatusLabels: Record<OrderItemStatus, string> = {
  new: 'New',
  waiting_color: 'Waiting for color',
  scheduled: 'Scheduled',
  printing: 'Printing',
  printed: 'Printed',
  assembled: 'Assembled',
  done: 'Done',
  blocked: 'Blocked',
}

function hasFallbackResolvedColor(item: any) {
  const selectedParts = item.selectedParts ?? []
  if (selectedParts.some((part: any) => part.resolvedBy && part.resolvedBy !== 'globalColorId')) return true
  const selectedColors = item.selectedColors ?? []
  if (selectedColors.some((color: any) => !color.globalColorId && color.name)) return true
  if (item.selectedColor?.name && !item.selectedColor.globalColorId) return true
  return false
}

const itemStatusTone: Record<OrderItemStatus, string> = {
  new: 'bg-secondary text-muted-foreground',
  waiting_color: 'bg-amber-100 text-amber-900',
  scheduled: 'bg-sky-100 text-sky-900',
  printing: 'bg-violet-100 text-violet-900',
  printed: 'bg-indigo-100 text-indigo-900',
  assembled: 'bg-emerald-100 text-emerald-900',
  done: 'bg-emerald-100 text-emerald-900',
  blocked: 'bg-destructive/10 text-destructive',
}

function formatOrderDate(value: Date | string) {
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getOrderItemStatus(item: OrderItem): OrderItemStatus {
  return item.itemStatus ?? 'new'
}

function getFactoryStatus(jobs?: any[]) {
  if (!jobs || jobs.length === 0) return { label: 'Awaiting Generation', tone: 'bg-secondary text-muted-foreground' }
  const allAssembled = jobs.every(j => j.status === 'assembled')
  if (allAssembled) return { label: 'Ready to Ship', tone: 'bg-emerald-100 text-emerald-900' }
  const allPrinted = jobs.every(j => j.status === 'printed' || j.status === 'assembled')
  if (allPrinted) return { label: 'In Assembly', tone: 'bg-amber-100 text-amber-900' }
  return { label: 'In Production', tone: 'bg-violet-100 text-violet-900' }
}

function getShippingLabel(method?: OrderRecord['shippingMethod']) {
  return method === 'mainland_portugal' ? 'Portugal mainland shipping' : 'Pickup in Carcavelos'
}

function OrderEditDialog({
  order,
  draft,
  onDraftChange,
  onClose,
  onSave,
  isSaving,
  allProductionJobs,
}: {
  order: any
  draft: any
  onDraftChange: (order: any) => void
  onClose: () => void
  onSave: () => void
  isSaving: boolean
  allProductionJobs: any[]
}) {
  const router = useRouter()
  // Combine jobs linked via orderId (from order.productionJobs) and orderRequestId
  const linkedJobs = useMemo(() => {
    const orderJobs = order.productionJobs ?? []
    const requestJobs = order.isRequest
      ? allProductionJobs.filter(j => j.orderRequestId === order.id)
      : []
    return [...orderJobs, ...requestJobs]
  }, [order, allProductionJobs])
  const [productionJobs, setProductionJobs] = useState<any[]>(linkedJobs)
  const [pendingJobAction, setPendingJobAction] = useState<{ jobId: string; action: 'requeue' | 'cancel' } | null>(null)

  useEffect(() => {
    setProductionJobs(linkedJobs)
  }, [linkedJobs])
  const updateDraft = (patch: Partial<OrderRecord>) => onDraftChange({ ...draft, ...patch })
  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    onDraftChange({
      ...draft,
      items: draft.items.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, ...patch } : item),
    })
  }

  const updateProductionJob = async (jobId: string, action: 'requeue' | 'cancel') => {
    setPendingJobAction({ jobId, action })
    try {
      if (action === 'requeue') {
        await requeueJob(jobId)
        setProductionJobs(current => current.map(job => job.id === jobId ? {
          ...job,
          status: 'queued',
          printerId: null,
          scheduledDate: null,
          startedAt: null,
          completedAt: null,
          assignedSpoolIds: [],
          spoolAllocations: [],
        } : job))
        toast.success('Job requeued')
      } else {
        await cancelJob(jobId)
        setProductionJobs(current => current.map(job => job.id === jobId ? {
          ...job,
          status: 'cancelled',
          printerId: null,
          scheduledDate: null,
          startedAt: null,
          completedAt: null,
          assignedSpoolIds: [],
          spoolAllocations: [],
        } : job))
        toast.success('Job cancelled')
      }
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed'
      toast.error(message)
    } finally {
      setPendingJobAction(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-border bg-background shadow-xl sm:mx-auto sm:max-w-6xl sm:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{draft.customerName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close order editor">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-4 lg:grid-cols-[1fr_1fr]">
          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <h3 className="mb-3 font-semibold text-foreground">Customer</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="order-customer-name">Name</Label>
                  <Input id="order-customer-name" value={draft.customerName} onChange={event => updateDraft({ customerName: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="order-customer-email">Email</Label>
                  <Input id="order-customer-email" value={draft.customerEmail ?? ''} onChange={event => updateDraft({ customerEmail: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="order-customer-phone">Phone / WhatsApp</Label>
                  <Input id="order-customer-phone" value={draft.customerPhone ?? ''} onChange={event => updateDraft({ customerPhone: event.target.value })} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary p-4">
              <h3 className="mb-3 font-semibold text-foreground">Order details</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="order-payment-status">Payment</Label>
                    <select
                      id="order-payment-status"
                      value={draft.paymentStatus}
                      onChange={event => updateDraft({ paymentStatus: event.target.value as OrderRecord['paymentStatus'] })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="order-fulfillment-status">Fulfillment</Label>
                    <select
                      id="order-fulfillment-status"
                      value={draft.fulfillmentStatus}
                      onChange={event => updateDraft({ fulfillmentStatus: event.target.value as OrderRecord['fulfillmentStatus'] })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {Object.entries(fulfillmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="order-notes">Notes</Label>
                  <textarea
                    id="order-notes"
                    value={draft.notes ?? ''}
                    onChange={event => updateDraft({ notes: event.target.value })}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {!order.isRequest && (
              <div className="rounded-lg border border-border bg-secondary p-4">
                <h3 className="mb-3 font-semibold text-foreground">Delivery</h3>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="order-shipping-method">Method</Label>
                    <select
                      id="order-shipping-method"
                      value={draft.shippingMethod ?? 'pickup_carcavelos'}
                      onChange={event => onDraftChange({
                        ...draft,
                        shippingMethod: event.target.value as OrderRecord['shippingMethod'],
                        shippingAddress: event.target.value === 'pickup_carcavelos' ? '' : draft.shippingAddress,
                      })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="pickup_carcavelos">Pickup in Carcavelos</option>
                      <option value="mainland_portugal">Portugal mainland shipping</option>
                    </select>
                  </div>
                  {draft.shippingMethod === 'mainland_portugal' ? (
                    <div>
                      <Label htmlFor="order-shipping-address">Shipping address</Label>
                      <textarea
                        id="order-shipping-address"
                        value={draft.shippingAddress ?? ''}
                        onChange={event => updateDraft({ shippingAddress: event.target.value })}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-background p-3">
                      <p className="text-sm font-medium text-foreground">Pickup in Carcavelos</p>
                      <p className="mt-1 text-xs text-muted-foreground">Use "Ready for pickup" when the order is assembled and waiting for customer collection.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-foreground">Items</h3>
                <p className="text-sm text-muted-foreground">Total €{draft.total.toFixed(2)}</p>
              </div>
              <div className="space-y-3">
                {draft.items.map((item: any, index: number) => (
                  <div key={`${item.productName}-${index}`} className="rounded-lg border border-border bg-background p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                      <div>
                        <Label htmlFor={`item-${index}-name`}>Product</Label>
                        <Input id={`item-${index}-name`} value={item.productName} onChange={event => updateItem(index, { productName: event.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`item-${index}-quantity`}>Quantity</Label>
                        <Input id={`item-${index}-quantity`} type="number" min="1" value={item.quantity} onChange={event => updateItem(index, { quantity: Number(event.target.value) || 1 })} />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_150px_120px]">
                      <div>
                        <Label htmlFor={`item-${index}-colors`} className="inline-flex items-center gap-1">
                          Colors / parts
                          {hasFallbackResolvedColor(item) && (
                            <span
                              className="text-amber-500"
                              title="Cor resolvida por nome; pode não corresponder exactamente ao material actual"
                            >
                              ⚠
                            </span>
                          )}
                        </Label>
                        <Input
                          id={`item-${index}-colors`}
                          value={item.colors.join(', ')}
                          onChange={event => updateItem(index, { colors: event.target.value.split(',').map(color => color.trim()).filter(Boolean) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`item-${index}-status`}>Item status</Label>
                        <select
                          id={`item-${index}-status`}
                          value={getOrderItemStatus(item)}
                          onChange={event => updateItem(index, { itemStatus: event.target.value as OrderItemStatus })}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {Object.entries(itemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor={`item-${index}-done`}>Done</Label>
                        <Input id={`item-${index}-done`} type="number" min="0" value={item.quantityDone ?? 0} onChange={event => updateItem(index, { quantityDone: Number(event.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Production Breakdown */}
            <div className="rounded-lg border border-border bg-violet-50/30 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-violet-900">
                <Hammer className="h-4 w-4" /> Production Breakdown
              </h3>
              {productionJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No production jobs generated yet.</p>
              ) : (
                <div className="overflow-hidden rounded-md border border-violet-100 bg-background">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-violet-50 text-violet-900">
                      <tr>
                        <th className="px-2 py-1.5 font-semibold">Part</th>
                        <th className="px-2 py-1.5 font-semibold">Color</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Qty</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Status</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-50">
                      {productionJobs.map((job: any) => {
                        const canFixJob = job.status === 'printed' || job.status === 'failed'
                        const isRequeueing = pendingJobAction?.jobId === job.id && pendingJobAction?.action === 'requeue'
                        const isCancelling = pendingJobAction?.jobId === job.id && pendingJobAction?.action === 'cancel'
                        const isPending = pendingJobAction?.jobId === job.id

                        return (
                          <tr key={job.id}>
                            <td className="px-2 py-1.5 font-medium">{job.partLabel}</td>
                            <td className="px-2 py-1.5">{job.colorName}</td>
                            <td className="px-2 py-1.5 text-right">{job.quantity}</td>
                            <td className="px-2 py-1.5 text-right">
                               <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase">{job.status}</Badge>
                            </td>
                            <td className="px-2 py-1.5">
                              {canFixJob && (
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px]"
                                    disabled={isPending}
                                    onClick={() => updateProductionJob(job.id, 'requeue')}
                                  >
                                    {isRequeueing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1 h-3 w-3" />}
                                    Re-print
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={isPending}
                                    onClick={() => updateProductionJob(job.id, 'cancel')}
                                  >
                                    {isCancelling ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Ban className="mr-1 h-3 w-3" />}
                                    Cancel Job
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-background p-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}

type OrderRequest = {
  id: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  companyName?: string
  productName?: string
  productSlug?: string
  status: 'PENDING_REVIEW' | 'MODELING' | 'AWAITING_PAYMENT' | 'READY_FOR_PRODUCTION' | 'IN_PRODUCTION' | 'SHIPPED' | 'B2B_LEAD'
  isPaid?: boolean
  selectedPrice?: number
  createdAt: Date | string
}

const orderRequestStatusLabels: Record<OrderRequest['status'], string> = {
  PENDING_REVIEW: 'Pendente',
  MODELING: 'Modelação',
  AWAITING_PAYMENT: 'Aguarda pagamento',
  READY_FOR_PRODUCTION: 'Pronto para produção',
  IN_PRODUCTION: 'Em produção',
  SHIPPED: 'Enviado',
  B2B_LEAD: 'Lead B2B',
}

const orderRequestStatusTone: Record<OrderRequest['status'], string> = {
  PENDING_REVIEW: 'bg-sky-100 text-sky-900',
  MODELING: 'bg-violet-100 text-violet-900',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-900',
  READY_FOR_PRODUCTION: 'bg-lime-100 text-lime-900',
  IN_PRODUCTION: 'bg-emerald-100 text-emerald-900',
  SHIPPED: 'bg-indigo-100 text-indigo-900',
  B2B_LEAD: 'bg-orange-100 text-orange-900',
}

export function OrdersManager({
  orders,
  orderRequests,
  allProductionJobs,
}: {
  orders: any[]
  orderRequests: OrderRequest[]
  allProductionJobs: any[]
}) {
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [shippingMethod, setShippingMethod] = useState<OrderRecord['shippingMethod']>('pickup_carcavelos')
  const [shippingAddress, setShippingAddress] = useState('')
  const [itemText, setItemText] = useState('')
  const [subtotal, setSubtotal] = useState('0')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | OrderRecord['paymentStatus']>('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | OrderRecord['fulfillmentStatus']>('new')
  const [itemFilter, setItemFilter] = useState<'all' | OrderItemStatus>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'total_desc' | 'total_asc' | 'customer'>('recent')
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [draftOrder, setDraftOrder] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders')
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | OrderRequest['status']>('all')
  const [requestPaymentFilter, setRequestPaymentFilter] = useState<'all' | 'paid' | 'unpaid' | 'not_applicable'>('all')
  const [pendingPaymentSyncId, setPendingPaymentSyncId] = useState<string | null>(null)
  const router = useRouter()

  const shippingCost = shippingMethod === 'mainland_portugal' && Number(subtotal) < 50 ? 9.99 : 0
  const total = (Number(subtotal) || 0) + shippingCost

  const createOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!customerPhone.trim() && !customerEmail.trim()) {
      window.alert('Add at least one contact: email or phone.')
      return
    }

    setIsSaving(true)
    const now = new Date()

    await db.transact(
      db.tx.orders[id()].update({
        customerName,
        customerEmail,
        customerPhone,
        paymentPreference: 'mbway',
        shippingMethod,
        shippingAddress,
        items: [{
          productName: itemText || 'Manual order',
          quantity: 1,
          colors: [],
          unitPrice: Number(subtotal) || 0,
          itemStatus: 'new',
          adminNotes: '',
          scheduledFor: '',
          quantityDone: 0,
        }],
        subtotal: Number(subtotal) || 0,
        shippingCost,
        total,
        paymentStatus: 'pending',
        fulfillmentStatus: 'new',
        notes,
        createdAt: now,
        updatedAt: now,
      }),
    )

    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setShippingAddress('')
    setItemText('')
    setSubtotal('0')
    setNotes('')
    setIsSaving(false)
  }

  const updateOrder = async (order: OrderRecord, patch: Partial<OrderRecord>) => {
    await db.transact(
      db.tx.orders[order.id].update({
        ...patch,
        updatedAt: new Date(),
      }),
    )
  }

  const deleteOrder = async (order: any) => {
    const confirmed = window.confirm(`Delete order for ${order.customerName}? This cannot be undone.`)
    if (!confirmed) return

    await db.transact(db.tx.orders[order.id].delete())
  }

  const syncStripePayment = async (order: OrderRecord) => {
    setPendingPaymentSyncId(order.id)
    try {
      const result = await recheckStripeOrderPayment(order.id)
      if (result.updated) {
        toast.success(result.message)
      } else {
        toast.info(result.message)
      }
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível confirmar o pagamento Stripe.')
    } finally {
      setPendingPaymentSyncId(null)
    }
  }

  const openEditor = (order: any, isRequest: boolean = false) => {
    setEditingOrder({ ...order, isRequest })
    if (isRequest) {
      // For order requests, we don't have items array
      setDraftOrder({
        ...order,
        items: [{
          productName: order.productName || order.productSlug || 'Custom product',
          quantity: 1,
          colors: [],
          unitPrice: order.selectedPrice || 0,
          itemStatus: order.status === 'IN_PRODUCTION' ? 'printing' : 'new',
        }],
        paymentStatus: order.isPaid ? 'paid' : 'pending',
        fulfillmentStatus: order.status === 'SHIPPED' ? 'shipped' : order.status === 'IN_PRODUCTION' ? 'printing' : 'new',
        total: order.selectedPrice || 0,
        subtotal: order.selectedPrice || 0,
        shippingCost: 0,
      })
    } else {
      setDraftOrder({
        ...order,
        items: order.items.map((item: any) => ({
          ...item,
          itemStatus: getOrderItemStatus(item),
          adminNotes: item.adminNotes ?? '',
          scheduledFor: item.scheduledFor ?? '',
          quantityDone: item.quantityDone ?? 0,
        })),
      })
    }
  }

  const saveEditedOrder = async () => {
    if (!editingOrder || !draftOrder) return
    setIsEditing(true)

    if (editingOrder.isRequest) {
      // Update order request
      await db.transact(
        db.tx.orderRequests[editingOrder.id].update({
          customerName: draftOrder.customerName,
          customerEmail: draftOrder.customerEmail,
          customerPhone: draftOrder.customerPhone,
          status: draftOrder.fulfillmentStatus === 'shipped' ? 'SHIPPED' : draftOrder.fulfillmentStatus === 'printing' ? 'IN_PRODUCTION' : 'PENDING_REVIEW',
          isPaid: draftOrder.paymentStatus === 'paid',
          selectedPrice: draftOrder.total || draftOrder.subtotal,
          notes: draftOrder.notes,
          updatedAt: new Date(),
        }),
      )
    } else {
      // Update normal order
      await updateOrder(editingOrder, {
        customerName: draftOrder.customerName,
        customerEmail: draftOrder.customerEmail,
        customerPhone: draftOrder.customerPhone,
        paymentPreference: draftOrder.paymentPreference,
        shippingMethod: draftOrder.shippingMethod,
        shippingAddress: draftOrder.shippingAddress,
        items: draftOrder.items,
        subtotal: draftOrder.subtotal,
        shippingCost: draftOrder.shippingCost,
        total: draftOrder.total,
        paymentStatus: draftOrder.paymentStatus,
        fulfillmentStatus: draftOrder.fulfillmentStatus,
        notes: draftOrder.notes,
        updatedAt: new Date(),
      })
    }

    setIsEditing(false)
    setEditingOrder(null)
    setDraftOrder(null)
  }

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return orders
      .filter(order => {
        if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) return false
        if (fulfillmentFilter !== 'all' && order.fulfillmentStatus !== fulfillmentFilter) return false
        if (itemFilter !== 'all' && !order.items.some((item: any) => getOrderItemStatus(item) === itemFilter)) return false
        if (!normalizedQuery) return true

        const haystack = [
          order.id,
          order.customerName,
          order.customerEmail ?? '',
          order.customerPhone ?? '',
          order.shippingAddress ?? '',
          order.notes ?? '',
        ].join(' ').toLowerCase()

        return haystack.includes(normalizedQuery)
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
          case 'total_desc':
            return right.total - left.total
          case 'total_asc':
            return left.total - right.total
          case 'customer':
            return left.customerName.localeCompare(right.customerName)
          case 'recent':
          default:
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        }
      })
  }, [fulfillmentFilter, itemFilter, orders, paymentFilter, query, sortBy])

  const stats = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    Object.keys(fulfillmentLabels).forEach(status => {
      counts[status] = orders.filter(o => o.fulfillmentStatus === status).length
    })
    return counts
  }, [orders])

  // Filter order requests based on search query
  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return orderRequests
      .filter(request => {
        if (requestStatusFilter !== 'all' && request.status !== requestStatusFilter) return false
        if (requestPaymentFilter === 'paid' && !request.isPaid) return false
        if (requestPaymentFilter === 'unpaid' && (request.isPaid || request.status === 'B2B_LEAD')) return false
        if (requestPaymentFilter === 'not_applicable' && request.status !== 'B2B_LEAD') return false
        if (!normalizedQuery) return true
        const haystack = [
          request.id,
          request.customerName,
          request.customerEmail ?? '',
          request.customerPhone ?? '',
          request.companyName ?? '',
          request.productName ?? '',
          request.productSlug ?? '',
        ].join(' ').toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
          case 'total_desc':
            return (right.selectedPrice ?? 0) - (left.selectedPrice ?? 0)
          case 'total_asc':
            return (left.selectedPrice ?? 0) - (right.selectedPrice ?? 0)
          case 'customer':
            return (left.customerName || '').localeCompare(right.customerName || '')
          case 'recent':
          default:
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        }
      })
  }, [orderRequests, query, requestPaymentFilter, requestStatusFilter, sortBy])

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-foreground">Orders Manager</h2>
              <div className="flex rounded-md border border-border bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Orders ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
                    activeTab === 'requests'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Requests ({orderRequests.length})
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {activeTab === 'orders'
                ? 'Manage order lifecycle and production status.'
                : 'Custom product order requests awaiting review and production.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
             <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  value={query} 
                  onChange={event => setQuery(event.target.value)} 
                  placeholder="Search customer, product..." 
                  className="pl-9 h-9" 
                />
             </div>
             <select 
                value={sortBy} 
                onChange={event => setSortBy(event.target.value as typeof sortBy)} 
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="recent">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="total_desc">Highest total</option>
                <option value="total_asc">Lowest total</option>
                <option value="customer">Customer</option>
              </select>
          </div>
        </div>

        {activeTab === 'orders' ? (
          <>
            <div className="mt-6">
              <Tabs
                value={fulfillmentFilter}
                onValueChange={(val: any) => setFulfillmentFilter(val)}
                className="w-full"
              >
                <TabsList className="flex w-full h-auto p-1 bg-muted/50 overflow-x-auto justify-start scrollbar-hide">
                  <TabsTrigger value="all" className="gap-2 px-4 h-9">
                    All <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.all}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="new" className="gap-2 px-4 h-9">
                    <Clock className="h-3.5 w-3.5" /> New
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.new}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="printing" className="gap-2 px-4 h-9">
                    <Hammer className="h-3.5 w-3.5" /> Printing
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.printing}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="ready" className="gap-2 px-4 h-9">
                    <Package className="h-3.5 w-3.5" /> Ready
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.ready}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="ready_for_pickup" className="gap-2 px-4 h-9">
                    <Package className="h-3.5 w-3.5" /> Pickup
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.ready_for_pickup}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="shipped" className="gap-2 px-4 h-9">
                    <Truck className="h-3.5 w-3.5" /> Shipped
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.shipped}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="gap-2 px-4 h-9">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.completed}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="cancelled" className="gap-2 px-4 h-9">
                    <AlertCircle className="h-3.5 w-3.5" /> Cancelled
                    <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1 text-[10px]">{stats.cancelled}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Additional Filters:</p>
              <select value={paymentFilter} onChange={event => setPaymentFilter(event.target.value as typeof paymentFilter)} className="h-8 rounded border border-input bg-background px-2 text-[11px]">
                <option value="all">All payments</option>
                {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select value={itemFilter} onChange={event => setItemFilter(event.target.value as typeof itemFilter)} className="h-8 rounded border border-input bg-background px-2 text-[11px]">
                <option value="all">All item states</option>
                {Object.entries(itemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mr-2">Request Filters:</p>
            <select value={requestStatusFilter} onChange={event => setRequestStatusFilter(event.target.value as typeof requestStatusFilter)} className="h-8 rounded border border-input bg-background px-2 text-[11px]">
              <option value="all">All request statuses</option>
              {Object.entries(orderRequestStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={requestPaymentFilter} onChange={event => setRequestPaymentFilter(event.target.value as typeof requestPaymentFilter)} className="h-8 rounded border border-input bg-background px-2 text-[11px]">
              <option value="all">All payment states</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="not_applicable">N/A</option>
            </select>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-background">
        {activeTab === 'orders' ? (
          <>
            <div className="hidden border-b border-border bg-secondary/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground xl:grid xl:grid-cols-[1.2fr_1.5fr_1fr_0.8fr_0.8fr_0.8fr_96px] xl:gap-4">
              <span>Customer</span>
              <span>Items</span>
              <span>Factory Status</span>
              <span>Payment</span>
              <span>Fulfillment</span>
              <span>Total</span>
              <span className="text-right">Edit</span>
            </div>
            <div className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                   <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                   No orders found for this status.
                </div>
              ) : filteredOrders.map(order => {
            const factory = getFactoryStatus(order.productionJobs)
            const canSyncStripe = order.paymentPreference === 'stripe' && order.paymentStatus === 'pending' && Boolean(order.stripeSessionId)
            const isSyncingStripe = pendingPaymentSyncId === order.id

            return (
              <article key={order.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_1.5fr_1fr_0.8fr_0.8fr_0.8fr_96px] xl:items-start xl:gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{order.customerName}</h3>
                    <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">#{order.id.slice(0, 8)} · {formatOrderDate(order.createdAt)}</p>
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground">{getShippingLabel(order.shippingMethod)}</p>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs font-medium">{item.quantity}x {item.productName}</span>
                        <Badge variant="secondary" className={`text-[8px] h-3.5 px-1.5 uppercase ${itemStatusTone[getOrderItemStatus(item)]}`}>
                          {itemStatusLabels[getOrderItemStatus(item)]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 h-5 border-none shadow-none ${factory.tone}`}>{factory.label}</Badge>
                  </div>
                  <div>
                    <select 
                      value={order.paymentStatus} 
                      onChange={event => updateOrder(order, { paymentStatus: event.target.value as OrderRecord['paymentStatus'] })} 
                      className={`h-7 w-full rounded border border-input px-1.5 text-[10px] font-medium ${order.paymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-background'}`}
                    >
                      {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <select 
                      value={order.fulfillmentStatus} 
                      onChange={event => updateOrder(order, { fulfillmentStatus: event.target.value as OrderRecord['fulfillmentStatus'] })} 
                      className="h-7 w-full rounded border border-input bg-background px-1.5 text-[10px] font-medium"
                    >
                      {Object.entries(fulfillmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">€{order.total.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-end gap-1">
                    {canSyncStripe && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isSyncingStripe}
                        title="Recheck Stripe payment"
                        onClick={() => syncStripePayment(order)}
                      >
                        {isSyncingStripe ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(order)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
            </div>
          </>
        ) : (
          <>
            <div className="hidden border-b border-border bg-secondary/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground xl:grid xl:grid-cols-[1.2fr_1.5fr_1fr_0.8fr_0.8fr_0.8fr_96px] xl:gap-4">
              <span>Customer</span>
              <span>Product</span>
              <span>Jobs</span>
              <span>Payment</span>
              <span>Status</span>
              <span>Price</span>
              <span className="text-right">Edit</span>
            </div>
            <div className="divide-y divide-border">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                   <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                   No order requests found.
                </div>
              ) : filteredRequests.map(request => {
                const requestJobs = allProductionJobs.filter(j => j.orderRequestId === request.id)
                const factory = getFactoryStatus(requestJobs)

                return (
                  <article key={request.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="grid gap-4 xl:grid-cols-[1.2fr_1.5fr_1fr_0.8fr_0.8fr_0.8fr_96px] xl:items-start xl:gap-4">
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{request.customerName || 'Contacto B2B'}</h3>
                        <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">#{request.id.slice(0, 8)} · {formatOrderDate(request.createdAt)}</p>
                        {request.companyName && <p className="mt-1 text-[10px] text-muted-foreground">{request.companyName}</p>}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium">{request.status === 'B2B_LEAD' ? 'Para Empresas' : request.productName || request.productSlug || 'Custom product'}</span>
                      </div>
                      <div>
                        <Badge variant="outline" className={`text-[9px] uppercase font-bold px-1.5 h-5 border-none shadow-none ${factory.tone}`}>
                          {requestJobs.length > 0 ? `${requestJobs.length} jobs` : factory.label}
                        </Badge>
                      </div>
                      <div>
                        <Badge variant={request.isPaid ? 'default' : 'outline'} className="text-[10px] h-5">
                          {request.status === 'B2B_LEAD' ? 'N/A' : request.isPaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                      <div>
                        <Badge className={`text-[10px] h-5 ${orderRequestStatusTone[request.status]}`}>
                          {orderRequestStatusLabels[request.status]}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">€{(request.selectedPrice || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(request, true)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      {editingOrder && draftOrder && (
        <OrderEditDialog
          order={editingOrder}
          draft={draftOrder}
          onDraftChange={setDraftOrder}
          onClose={() => {
            setEditingOrder(null)
            setDraftOrder(null)
          }}
          onSave={saveEditedOrder}
          isSaving={isEditing}
          allProductionJobs={allProductionJobs}
        />
      )}
    </div>
  )
}
