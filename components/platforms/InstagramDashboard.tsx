"use client";

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, BarChart3, Hash, Image, Clock } from 'lucide-react';
// import { PostPlanner } from './instagram/PostPlanner';
// import { InstagramAnalytics } from './instagram/InstagramAnalytics';
// import { HashtagManager } from './instagram/HashtagManager';

export function InstagramDashboard({ onBack, products }: any) {
  const [activeTab, setActiveTab] = useState('planner');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Instagram Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">Manage posts, stories, reels & analytics</p>
        </div>
      </div>

      {/* <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="planner">
            <Calendar className="h-4 w-4 mr-2" />
            Post Planner
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="hashtags">
            <Hash className="h-4 w-4 mr-2" />
            Hashtags
          </TabsTrigger>
          <TabsTrigger value="besttimes">
            <Clock className="h-4 w-4 mr-2" />
            Best Times
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="mt-6">
          <PostPlanner products={products} platform="instagram" />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <InstagramAnalytics />
        </TabsContent>

        <TabsContent value="hashtags" className="mt-6">
          <HashtagManager />
        </TabsContent>

        <TabsContent value="besttimes" className="mt-6">
          <BestTimesOptimizer platform="instagram" />
        </TabsContent>
      </Tabs> */}
    </div>
  );
}