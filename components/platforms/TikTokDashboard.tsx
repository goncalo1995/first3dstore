"use client";

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Video, Music2, TrendingUp, Hash, BarChart3 } from 'lucide-react';
// import { VideoPlanner } from './tiktok/VideoPlanner';
// import { TrendTracker } from './tiktok/TrendTracker';
// import { SoundLibrary } from './tiktok/SoundLibrary';
// import { TikTokAnalytics } from './tiktok/TikTokAnalytics';
import { Card, CardContent } from '../ui/card';

export function TikTokDashboard({ onBack, products }: any) {
  const [activeTab, setActiveTab] = useState('planner');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">TikTok Dashboard</h2>
          <p className="text-sm text-muted-foreground">Create viral content & track trends</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">12.5k</p>
              <p className="text-xs text-muted-foreground">Total Views (7d)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">847</p>
              <p className="text-xs text-muted-foreground">New Followers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">8.2%</p>
              <p className="text-xs text-muted-foreground">Engagement Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">Trending Videos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="planner">
            <Video className="h-4 w-4 mr-2" />
            Video Planner
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="sounds">
            <Music2 className="h-4 w-4 mr-2" />
            Sounds
          </TabsTrigger>
          <TabsTrigger value="hashtags">
            <Hash className="h-4 w-4 mr-2" />
            Hashtags
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="mt-6">
          <VideoPlanner products={products} platform="tiktok" />
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <TrendTracker />
        </TabsContent>

        <TabsContent value="sounds" className="mt-6">
          <SoundLibrary />
        </TabsContent>

        <TabsContent value="hashtags" className="mt-6">
          <HashtagManager platform="tiktok" />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <TikTokAnalytics />
        </TabsContent>
      </Tabs> */}
    </div>
  );
}