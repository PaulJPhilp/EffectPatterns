import { HashSet } from "effect";

// Create a HashSet from an array
const setA = HashSet.fromIterable([1, 2, 3]);
const setB = HashSet.fromIterable([3, 4, 5]);

// Membership check
const hasTwo = HashSet.has(setA, 2); // true

// Union, intersection, difference
const union = HashSet.union(setA, setB);         // HashSet {1, 2, 3, 4, 5}
const intersection = HashSet.intersection(setA, setB); // HashSet {3}
const difference = HashSet.difference(setA, setB);     // HashSet {1, 2}

// Add and remove elements
const withSix = HashSet.add(setA, 6);    // HashSet {1, 2, 3, 6}
const withoutOne = HashSet.remove(setA, 1); // HashSet {2, 3}