#!/usr/bin/env bun
// Simple test script for Execution service

console.log("Hello from test script!");
console.log("This script outputs to stdout");
console.error("This script outputs to stderr");

// Simulate some work
await new Promise(resolve => setTimeout(resolve, 100));

console.log("Test script completed successfully");
