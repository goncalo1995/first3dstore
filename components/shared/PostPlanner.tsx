// components/shared/PostPlanner.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Calendar, Image, Sparkles } from 'lucide-react';
// import { CreatePostModal } from './CreatePostModal';

export function PostPlanner({ products, platform }: any) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [posts, setPosts] = useState([]); // Fetch from API

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Content Calendar</h3>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New {platform === 'instagram' ? 'Post/Reel' : 'Video'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post: any) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              {/* Post preview */}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* <CreatePostModal 
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        products={products}
        platform={platform}
      /> */}
    </div>
  );
}