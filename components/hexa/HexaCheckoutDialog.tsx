// components/hexa/HexaCheckoutDialog.tsx
'use client'

import { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HexaCustomer } from '@/types/hexa'

interface HexaCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (customer: HexaCustomer) => void
  isSubmitting: boolean
  customer: HexaCustomer
  setCustomer: (customer: HexaCustomer) => void
}

export function HexaCheckoutDialog({ open, onOpenChange, onSubmit, isSubmitting, customer, setCustomer }: HexaCheckoutDialogProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(customer)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar Encomenda</DialogTitle>
          <DialogDescription id="checkout-description">
            Vamos abrir o pagamento seguro Stripe. Depois do pagamento, preparamos a sua produção.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telemóvel</Label>
            <Input id="phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="spaceType">Tipo de espaço</Label>
            <Select value={customer.spaceType} onValueChange={(value) => setCustomer({ ...customer, spaceType: value as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Casa">Casa</SelectItem>
                <SelectItem value="Escritório">Escritório</SelectItem>
                <SelectItem value="Loja">Loja</SelectItem>
                <SelectItem value="Restaurante">Restaurante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
            {isSubmitting ? 'A preparar pagamento...' : 'Pagar com Stripe'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}