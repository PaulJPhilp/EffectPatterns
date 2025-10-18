import React from "react";
export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-4 font-bold text-4xl">Effect Patterns Hub</h1>
      <p className="mb-8 text-gray-600 text-lg">
        Learn Effect through curated roadmaps, interactive patterns, and
        AI-assisted learning
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* TODO: Map over modules from Catalog service */}
        <div className="rounded-lg border p-6 transition-shadow hover:shadow-lg">
          <h2 className="mb-2 font-semibold text-2xl">Module 1</h2>
          <p className="text-gray-600">Foundation patterns and core concepts</p>
        </div>
      </div>
    </main>
  );
}
