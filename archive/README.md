# Archived Files

This directory contains deprecated versions of the Power Flow Visualization tools.
These files are kept for historical reference but should **NOT** be used for new work.

## Recommended Current Versions

Use these files instead:

| Current File | Description |
|--------------|-------------|
| `power_flow_intuitive_v6_fixed.html` | **Recommended** - Standard intuitive visualizer with bug fixes and JSDoc documentation |
| `power_flow_intuitive_v7.html` | Large-scale system support with Y-matrix spy plot and network graph visualization |

## Archived Files

### power_flow_intuitive.html (Original)
- **Status**: Deprecated
- **Reason**: Superseded by v6_fixed with enhanced precision tracking, adaptive step size, and detailed trajectory visualization
- **Original Features**: Basic Newton-Raphson, Gauss-Seidel, and gradient descent visualization

### power_flow_intuitive_v3.html
- **Status**: Deprecated
- **Reason**: Same code as original, no significant improvements
- **Original Features**: Same as original version

### power_flow_intuitive_v4.html
- **Status**: Deprecated
- **Reason**: Added DC power flow but superseded by more robust implementations
- **Original Features**: Added DC power flow comparison, true solution computation

### power_flow_intuitive_v5.html
- **Status**: Deprecated
- **Reason**: Intermediate version, superseded by v6_fixed with better numerical stability
- **Original Features**: Improved problem definitions, better logging

### power_flow_intuitive_v6.html
- **Status**: Deprecated
- **Reason**: Contains bugs fixed in v6_fixed
- **Original Features**: Multi-bus problem support, backtracking line search
- **Note**: Use `power_flow_intuitive_v6_fixed.html` instead

## Why These Files Were Archived

1. **Code Duplication**: Multiple versions contained nearly identical code with minor variations
2. **Bug Fixes**: v6_fixed addresses issues found in earlier versions
3. **Documentation**: Current versions include comprehensive JSDoc documentation
4. **Consistency**: Archiving helps maintain a cleaner project structure

## Migration Guide

If you were using any of these archived files:

1. Replace with `power_flow_intuitive_v6_fixed.html` for standard use cases
2. Use `power_flow_intuitive_v7.html` for large-scale systems (30+ buses)

The API and UI remain largely compatible - most code changes are internal improvements
to numerical stability, documentation, and code organization.

## Archive Date

Archived: 2026-01-12

---

*These files are preserved for reference only. They may be removed in future releases.*
