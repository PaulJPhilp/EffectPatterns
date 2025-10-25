// Script to fix useCase validation issues in published patterns
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Mapping from old categories to new VALID_USE_CASES
const categoryMapping = {
  // Core concepts
  'Core Concepts': 'core-concepts',
  'Combinators': 'core-concepts',
  'Composition': 'core-concepts',
  'Constructors': 'core-concepts',
  'Lifting': 'core-concepts',
  'Conversion': 'core-concepts',
  'Pairing': 'core-concepts',
  'Sequencing': 'core-concepts',
  'Branching': 'core-concepts',
  'Effectful Branching': 'core-concepts',
  'Conditional Logic': 'core-concepts',
  'Pattern Matching': 'core-concepts',
  'Interop': 'core-concepts',
  
  // Error management
  'Error Handling': 'error-management',
  'Error Management': 'error-management',
  'Either': 'error-management',
  'Absence': 'error-management',
  'Checks': 'error-management',
  
  // Concurrency
  'Concurrency': 'concurrency',
  'Parallelism': 'concurrency',
  'Async': 'concurrency',
  'Callback': 'concurrency',
  'Side Effects': 'concurrency',
  
  // Resource management
  'Resource Management': 'resource-management',
  'Streams': 'resource-management',
  'Batch Processing': 'resource-management',
  'State': 'resource-management',
  'Mutable State': 'resource-management',
  
  // Dependency injection
  'Dependency Injection': 'dependency-injection',
  'Advanced Dependency Injection': 'advanced-dependency-injection',
  'Custom Layers': 'custom-layers',
  
  // Testing
  'Testing': 'testing',
  
  // Observability
  'Observability': 'observability',
  'Logging': 'observability',
  'Debugging': 'observability',
  'Instrumentation': 'observability',
  'Function Calls': 'observability',
  'Metrics': 'observability',
  'Monitoring': 'observability',
  'Performance': 'observability',
  'Tracing': 'observability',
  'OpenTelemetry': 'observability',
  
  // Domain modeling
  'Domain Modeling': 'domain-modeling',
  'Branded Types': 'domain-modeling',
  'Type Safety': 'domain-modeling',
  'Validation': 'domain-modeling',
  'Parsing': 'domain-modeling',
  'ADTs': 'domain-modeling',
  'Tagged Unions': 'domain-modeling',
  'Type Classes': 'domain-modeling',
  
  // Application architecture
  'Application Architecture': 'application-architecture',
  'Distributed Systems': 'application-architecture',
  
  // Building APIs
  'Building APIs': 'building-apis',
  
  // Network requests
  'Network Requests': 'network-requests',
  'Making HTTP Requests': 'making-http-requests',
  
  // File handling
  'File Handling': 'file-handling',
  
  // Database connections
  'Database Connections': 'database-connections',
  
  // Modeling data
  'Data Types': 'modeling-data',
  'Arrays': 'modeling-data',
  'Collections': 'modeling-data',
  'Tuples': 'modeling-data',
  'Set Operations': 'modeling-data',
  'Hashing': 'modeling-data',
  'Structural Equality': 'modeling-data',
  'Equality': 'modeling-data',
  'Ordering': 'modeling-data',
  'Option': 'modeling-data',
  'Optional Values': 'modeling-data',
  'Effect Results': 'modeling-data',
  
  // Modeling time
  'Time': 'modeling-time',
  'Duration': 'modeling-time',
  'Date': 'modeling-time',
  
  // Building data pipelines
  'Building Data Pipelines': 'building-data-pipelines',
  
  // Tooling and debugging
  'Tooling and Debugging': 'tooling-and-debugging',
  
  // Project setup & execution
  'Project Setup & Execution': 'project-setup--execution',
  
  // Application configuration
  'Application Configuration': 'core-concepts',
  
  // Security
  'Security': 'core-concepts',
  'Sensitive Data': 'core-concepts',
  
  // Numeric/scientific
  'Financial': 'core-concepts',
  'Scientific': 'core-concepts',
  'Numeric Precision': 'core-concepts'
};

// Priority order for selecting the best useCase when multiple are mapped
const priorityOrder = [
  'domain-modeling', // Most specific
  'error-management',
  'concurrency', 
  'resource-management',
  'dependency-injection',
  'advanced-dependency-injection',
  'observability',
  'application-architecture',
  'building-apis',
  'network-requests',
  'file-handling',
  'database-connections',
  'modeling-data',
  'modeling-time',
  'building-data-pipelines',
  'tooling-and-debugging',
  'project-setup--execution',
  'making-http-requests',
  'custom-layers',
  'testing',
  'core-concepts' // Least specific
];

function mapUseCase(oldUseCase) {
  if (!Array.isArray(oldUseCase)) {
    return oldUseCase; // Already a string
  }
  
  const mapped = oldUseCase
    .map(cat => categoryMapping[cat.trim()])
    .filter(Boolean); // Remove unmapped categories
  
  if (mapped.length === 0) {
    return 'core-concepts'; // Default fallback
  }
  
  // If only one mapping, use it
  if (mapped.length === 1) {
    return mapped[0];
  }
  
  // If multiple, choose the highest priority one
  for (const priority of priorityOrder) {
    if (mapped.includes(priority)) {
      return priority;
    }
  }
  
  // Fallback to first mapped value
  return mapped[0];
}

async function fixUseCaseInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(content);
  
  if (!parsed.data.useCase) {
    return false; // No useCase to fix
  }
  
  const oldUseCase = parsed.data.useCase;
  const newUseCase = mapUseCase(oldUseCase);
  
  if (JSON.stringify(oldUseCase) === JSON.stringify(newUseCase)) {
    return false; // No change needed
  }
  
  console.log('Fixing ' + path.basename(filePath) + ': ' + JSON.stringify(oldUseCase) + ' -> ' + newUseCase);
  
  // Update the frontmatter
  parsed.data.useCase = newUseCase;
  
  // Write back the file
  const newContent = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  return true;
}

async function main() {
  const publishedDir = path.join(process.cwd(), 'content/published');
  const files = fs.readdirSync(publishedDir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => path.join(publishedDir, f));
  
  console.log('Processing ' + files.length + ' pattern files...');
  
  let fixed = 0;
  for (const file of files) {
    if (await fixUseCaseInFile(file)) {
      fixed++;
    }
  }
  
  console.log('Fixed ' + fixed + ' files');
}

main().catch(console.error);
