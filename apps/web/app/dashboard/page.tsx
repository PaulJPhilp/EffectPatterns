import React from "react";
export default function DashboardPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-8 font-bold text-4xl">Your Dashboard</h1>

      {/* TODO: Add Clerk authentication */}
      {/* TODO: Load user progress from Convex */}
      <div className="space-y-6">
        <section>
          <h2 className="mb-4 font-semibold text-2xl">Your Learning Plan</h2>
          <p className="text-gray-600">
            Sign in to generate a personalized learning plan
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-semibold text-2xl">Progress</h2>
          <p className="text-gray-600">Track your completed patterns here</p>
        </section>
      </div>
    </main>
  );
}
