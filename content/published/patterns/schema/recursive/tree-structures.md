---
id: schema-tree-structures
title: Tree Structures - File Systems, Org Charts, Hierarchies
category: recursive
skill: intermediate
tags:
  - schema
  - recursive
  - trees
  - file-systems
  - hierarchies
  - org-charts
---

# Problem

Real applications work with trees constantly: file systems, org charts, category hierarchies, DOM trees. Each node has metadata and children. You need to parse, validate, and manipulate these hierarchies with type safety. Without proper recursive schemas, you end up with manual, error-prone tree traversal code.

# Solution

```typescript
import { Schema, Effect } from "effect"

// ============================================
// 1. File system tree
// ============================================

type FileSystemNode = {
  name: string
  path: string
  type: "file" | "directory"
  size?: number
  mimeType?: string
  children?: FileSystemNode[]
  permissions?: {
    read: boolean
    write: boolean
    execute: boolean
  }
}

const FileSystemNode: Schema.Schema<FileSystemNode> = Schema.suspend(() =>
  Schema.Struct({
    name: Schema.String,
    path: Schema.String,
    type: Schema.Enum({ file: "file", directory: "directory" }),
    size: Schema.Optional(Schema.Number),
    mimeType: Schema.Optional(Schema.String),
    children: Schema.Optional(Schema.Array(FileSystemNode)),
    permissions: Schema.Optional(
      Schema.Struct({
        read: Schema.Boolean,
        write: Schema.Boolean,
        execute: Schema.Boolean,
      })
    ),
  })
)

// ============================================
// 2. Organization chart
// ============================================

type OrgChartNode = {
  id: string
  name: string
  title: string
  email: string
  department: string
  reportsTo?: string
  directReports: OrgChartNode[]
}

const OrgChartNode: Schema.Schema<OrgChartNode> = Schema.suspend(() =>
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    title: Schema.String,
    email: Schema.String,
    department: Schema.String,
    reportsTo: Schema.Optional(Schema.String),
    directReports: Schema.Array(OrgChartNode),
  })
)

// ============================================
// 3. Category hierarchy
// ============================================

type Category = {
  id: string
  name: string
  slug: string
  description: string
  parent?: string
  subcategories: Category[]
  productCount: number
}

const Category: Schema.Schema<Category> = Schema.suspend(() =>
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    description: Schema.String,
    parent: Schema.Optional(Schema.String),
    subcategories: Schema.Array(Category),
    productCount: Schema.Number,
  })
)

// ============================================
// 4. Tree utilities
// ============================================

const getFileSize = (node: FileSystemNode): number => {
  if (node.type === "file") {
    return node.size || 0
  }
  if (!node.children) return 0
  return node.children.reduce((sum, child) => sum + getFileSize(child), 0)
}

const getTreeDepth = <T extends { children?: T[] }>(node: T): number => {
  if (!node.children || node.children.length === 0) return 1
  return 1 + Math.max(...node.children.map(getTreeDepth))
}

const flattenTree = <T extends { children?: T[] }>(node: T): T[] => {
  return [node, ...(node.children || []).flatMap(flattenTree)]
}

const filterTree = <T extends { children?: T[] }>(
  node: T,
  predicate: (n: T) => boolean
): T | null => {
  if (!predicate(node)) return null

  const filteredChildren = (node.children || [])
    .map((child) => filterTree(child, predicate))
    .filter((n): n is T => n !== null)

  return { ...node, children: filteredChildren }
}

const mapTree = <T extends { children?: T[] }>(
  node: T,
  fn: (n: T) => T
): T => {
  const mapped = fn(node)
  if (!mapped.children) return mapped

  return {
    ...mapped,
    children: mapped.children.map((child) => mapTree(child, fn)),
  } as T
}

// ============================================
// 5. Processing effects
// ============================================

const listFiles = (node: FileSystemNode): Effect.Effect<void> =>
  Effect.gen(function* () {
    const indent = (node.path.match(/\//g) || []).length - 1
    const prefix = "  ".repeat(indent)

    if (node.type === "file") {
      const size = node.size ? ` (${node.size} bytes)` : ""
      yield* Effect.log(`${prefix}📄 ${node.name}${size}`)
    } else {
      yield* Effect.log(`${prefix}📁 ${node.name}/`)
      if (node.children) {
        for (const child of node.children) {
          yield* listFiles(child)
        }
      }
    }
  })

const printOrgChart = (
  node: OrgChartNode,
  level: number = 0
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const indent = "  ".repeat(level)
    yield* Effect.log(
      `${indent}${node.name} - ${node.title} (${node.department})`
    )

    for (const report of node.directReports) {
      yield* printOrgChart(report, level + 1)
    }
  })

// ============================================
// 6. Application logic
// ============================================

const appLogic = Effect.gen(function* () {
  console.log("=== File System ===\n")

  const filesystem: FileSystemNode = {
    name: "root",
    path: "/",
    type: "directory",
    children: [
      {
        name: "src",
        path: "/src",
        type: "directory",
        children: [
          {
            name: "index.ts",
            path: "/src/index.ts",
            type: "file",
            size: 1024,
            mimeType: "text/typescript",
          },
          {
            name: "utils.ts",
            path: "/src/utils.ts",
            type: "file",
            size: 2048,
            mimeType: "text/typescript",
          },
        ],
      },
      {
        name: "README.md",
        path: "/README.md",
        type: "file",
        size: 512,
        mimeType: "text/markdown",
      },
    ],
  }

  yield* listFiles(filesystem)

  console.log(`\nTotal size: ${getFileSize(filesystem)} bytes`)
  console.log(`Tree depth: ${getTreeDepth(filesystem)}`)

  console.log("\n=== Organization Chart ===\n")

  const org: OrgChartNode = {
    id: "ceo_001",
    name: "Alice Johnson",
    title: "CEO",
    email: "alice@company.com",
    department: "Executive",
    directReports: [
      {
        id: "eng_001",
        name: "Bob Smith",
        title: "VP Engineering",
        email: "bob@company.com",
        department: "Engineering",
        reportsTo: "ceo_001",
        directReports: [
          {
            id: "eng_002",
            name: "Charlie Brown",
            title: "Senior Engineer",
            email: "charlie@company.com",
            department: "Engineering",
            reportsTo: "eng_001",
            directReports: [],
          },
        ],
      },
      {
        id: "sales_001",
        name: "Diana Prince",
        title: "VP Sales",
        email: "diana@company.com",
        department: "Sales",
        reportsTo: "ceo_001",
        directReports: [],
      },
    ],
  }

  yield* printOrgChart(org)

  console.log(`\nTotal people: ${flattenTree(org).length}`)
  console.log(`Org depth: ${getTreeDepth(org)}`)

  console.log("\n=== Category Hierarchy ===\n")

  const categories: Category = {
    id: "electronics",
    name: "Electronics",
    slug: "electronics",
    description: "Electronic products",
    productCount: 0,
    subcategories: [
      {
        id: "computers",
        name: "Computers",
        slug: "computers",
        description: "Computers and laptops",
        parent: "electronics",
        productCount: 0,
        subcategories: [
          {
            id: "desktops",
            name: "Desktops",
            slug: "desktops",
            description: "Desktop computers",
            parent: "computers",
            productCount: 25,
            subcategories: [],
          },
          {
            id: "laptops",
            name: "Laptops",
            slug: "laptops",
            description: "Laptop computers",
            parent: "computers",
            productCount: 40,
            subcategories: [],
          },
        ],
      },
      {
        id: "phones",
        name: "Phones",
        slug: "phones",
        description: "Mobile phones",
        parent: "electronics",
        productCount: 30,
        subcategories: [],
      },
    ],
  }

  const all = flattenTree(categories)
  console.log(`Total categories: ${all.length}`)
  for (const cat of all) {
    const indent = "  ".repeat((cat.parent ? 1 : 0) + (all.indexOf(cat) % 2))
    console.log(`${indent}${cat.name} (${cat.productCount} products)`)
  }

  return { filesystem, org, categories }
})

// Run application
Effect.runPromise(appLogic)
  .then(() => console.log("\n✅ Tree structures complete"))
  .catch((error) => console.error(`Error: ${error.message}`))
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| **Recursive schemas** | Each node can contain children of same type |
| **Type safety** | Full TypeScript support for tree traversal |
| **Reusable utilities** | Generic functions work with any tree shape |
| **Pattern matching** | Walk tree with standard recursion patterns |
| **Transformation** | mapTree, filterTree enable functional tree ops |
| **Validation** | Each node validated according to schema |
| **Hierarchy** | Natural representation of real hierarchies |

# When to Use

- File system explorers
- Organization structures
- Category hierarchies for e-commerce
- DOM trees and components
- Permission hierarchies
- Decision trees
- Dependency graphs
- Menu structures

# Related Patterns

- [Basic Recursive](./basic-recursive.md)
- [Nested Comments](./nested-comments.md)
- [JSON AST](./json-ast.md)
