import React from "react";
export default function ModulesPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="mb-8 font-bold text-4xl">Learning Modules</h1>
      <p className="mb-8 text-gray-600 text-lg">
        Choose a module to begin your Effect learning journey
      </p>

      {/* TODO: Load modules from Catalog service */}
      <div className="space-y-4">
        <div className="rounded-lg border p-6">
          <h2 className="mb-2 font-semibold text-2xl">Module 1: Foundation</h2>
          <p className="mb-4 text-gray-600">
            Core concepts and building blocks
          </p>
          <a className="text-blue-600 hover:underline" href="/modules/module-1">
            View patterns →
          </a>
        </div>
      </div>
    </main>
  );
}
