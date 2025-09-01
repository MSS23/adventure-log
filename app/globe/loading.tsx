import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function GlobeLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-6">
        <div className="skeleton h-8 w-64 mb-2" />
        <div className="skeleton h-4 w-96" />
      </div>

      {/* Globe Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="skeleton h-6 w-12 mx-auto" />
                <div className="skeleton h-3 w-16 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Globe Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="skeleton h-6 w-32" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-8 w-20" />
              <div className="skeleton h-8 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Globe Container */}
          <div className="relative">
            <div className="w-full h-[600px] bg-black rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping" />
                  <div className="relative w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="50"
                        strokeDashoffset="25"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-lg font-medium">Loading 3D Globe...</p>
                <p className="text-sm opacity-75 mt-2">
                  Preparing your travel visualization
                </p>
              </div>
            </div>
          </div>

          {/* Controls Legend */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="skeleton h-4 w-48 mb-2" />
            <div className="skeleton h-3 w-64" />
          </div>
        </CardContent>
      </Card>

      {/* Pin List Loading (if visible) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="skeleton w-5 h-5 rounded" />
              <div className="skeleton h-6 w-32" />
            </div>
            <div className="skeleton h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-3 w-32" />
                <div className="flex items-center space-x-2">
                  <div className="skeleton w-3 h-3 rounded" />
                  <div className="skeleton h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
