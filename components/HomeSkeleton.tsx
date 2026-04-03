import React from 'react';

export function HomeSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="flex overflow-x-hidden gap-4 px-4 pb-4">
        {[1, 2].map((i) => (
          <div 
            key={i}
            className="relative w-[85vw] sm:w-[400px] shrink-0 aspect-[4/5] sm:aspect-video rounded-3xl bg-white/5 overflow-hidden"
          >
            <div className="absolute top-4 left-4 right-4 space-y-2">
              <div className="h-8 bg-white/10 rounded-lg w-3/4"></div>
              <div className="h-5 bg-white/10 rounded-lg w-1/2"></div>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="h-4 bg-white/10 rounded-lg w-2/3"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Speed Dial Skeleton */}
      <div>
        <div className="h-7 bg-white/10 rounded-lg w-48 mb-4 mx-4"></div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/5 rounded-2xl p-2 border border-white/10">
              <div className="w-full aspect-square rounded-xl bg-white/10"></div>
              <div className="mt-2 space-y-2">
                <div className="h-4 bg-white/10 rounded-lg w-4/5"></div>
                <div className="h-3 bg-white/10 rounded-lg w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal Scroll Skeletons */}
      {[1, 2].map((section) => (
        <div key={section} className="mb-8">
          <div className="h-7 bg-white/10 rounded-lg w-48 mb-4 mx-4"></div>
          <div className="flex overflow-x-hidden gap-4 px-4 pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-none w-36">
                <div className="w-36 h-36 rounded-xl bg-white/10 mb-2"></div>
                <div className="h-4 bg-white/10 rounded-lg w-full mb-1"></div>
                <div className="h-3 bg-white/10 rounded-lg w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
