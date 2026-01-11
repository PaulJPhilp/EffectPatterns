# Scheduling Jobs-to-be-Done

## What is this?

This document lists the **jobs** a developer needs to accomplish when scheduling and timing operations in Effect. We audit patterns against these jobs to find gaps.

---

## 1. Getting Started ✅

### Jobs:
- [x] Understand what schedules are
- [x] Create basic schedules (recurs, spaced)
- [x] Combine schedules

### Patterns (1):
- `scheduling-hello-world.mdx` - Your First Schedule

---

## 2. Retry Patterns ✅

### Jobs:
- [x] Retry failed operations
- [x] Implement exponential backoff
- [x] Limit retry attempts

### Patterns (2):
- `scheduling-retry-basics.mdx` - Retry Failed Operations
- `exponential-backoff.mdx` - Implement Exponential Backoff for Retries

---

## 3. Repetition Patterns ✅

### Jobs:
- [x] Repeat an effect on a fixed interval
- [x] Schedule tasks with cron expressions

### Patterns (2):
- `repeat-interval.mdx` - Repeat an Effect on a Fixed Interval
- `cron-schedule.mdx` - Schedule Tasks with Cron Expressions

---

## 4. Rate Limiting ✅

### Jobs:
- [x] Debounce and throttle execution

### Patterns (1):
- `debounce-throttle.mdx` - Debounce and Throttle Execution

---

## 5. Advanced Scheduling ✅

### Jobs:
- [x] Build retry chains with circuit breakers

### Patterns (1):
- `circuit-breakers.mdx` - Advanced Retry Chains and Circuit Breakers

---

## Summary

| Category | Jobs | Covered | Gaps |
|----------|------|---------|------|
| Getting Started | 3 | 1 | 0 |
| Retry Patterns | 3 | 2 | 0 |
| Repetition Patterns | 2 | 2 | 0 |
| Rate Limiting | 1 | 1 | 0 |
| Advanced Scheduling | 1 | 1 | 0 |
| **Total** | **10** | **7** | **0** |

### Coverage: 100%

Scheduling is well covered with 6 patterns across retry, repetition, and rate limiting.

