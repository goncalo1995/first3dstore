"use client";

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Search, Star, DollarSign, TrendingUp } from 'lucide-react';
// import { ListingManager } from './etsy/ListingManager';
// import { SEOOptimizer } from './etsy/SEOOptimizer';
// import { PriceMonitor } from './etsy/PriceMonitor';
// import { ReviewManager } from './etsy/ReviewManager';
import { Card, CardContent } from '../ui/card';

export function EtsyDashboard({ onBack, products, orders }: any) {
  const [activeTab, setActiveTab] = useState('listings');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
            Etsy Store Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">Manage listings, SEO, and sales</p>
        </div>
      </div>

      {/* Store Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">$1,234</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Monthly Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">23</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Orders This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Star className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">4.9</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Avg. Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">+18%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Sales Growth</p>
          </CardContent>
        </Card>
      </div>

      {/* <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="listings">
            <Package className="h-4 w-4 mr-2" />
            Listings
          </TabsTrigger>
          <TabsTrigger value="seo">
            <Search className="h-4 w-4 mr-2" />
            SEO Optimizer
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            Price Monitor
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Star className="h-4 w-4 mr-2" />
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6">
          <ListingManager products={products} />
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <SEOOptimizer products={products} />
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <PriceMonitor products={products} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <ReviewManager />
        </TabsContent>
      </Tabs> */}
    </div>
  );
}