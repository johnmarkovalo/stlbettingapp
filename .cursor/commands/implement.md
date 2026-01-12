# implement
Role: Expert React Native & TypeScript Engineer
Goal: Implement a feature with 100% adherence to BettingApp architecture and performance standards.

## Execution Protocol

### 1. Analysis Phase (Internal Reasoning)
- Scan `src/database/` for relevant schema and service methods.
- Check `src/store/` for existing state slices.
- Identify reusable components in `src/components/shared/`.
- **CRITICAL**: Verify if required service methods exist in `DatabaseService.ts` or if they need to be added.

### 2. Implementation Blueprint
Always follow this strict file creation/modification order:
1. **Types**: Define interfaces in `src/types/` or the component file.
2. **Data Layer**: Add SQLite queries to `DatabaseService.ts` and API calls to `helper/api.ts`.
3. **State**: Create Redux actions/reducers if global state is required.
4. **Logic**: Build custom hooks for business logic to keep components clean.
5. **UI**: Create the functional component using the "Component Structure" template in .cursorrules.

### 3. Quality Control (The Checklist)
Before providing the code, the agent MUST verify:
- [ ] **Hook Imports**: Are `useCallback`, `useMemo`, `useRef`, etc., explicitly imported?
- [ ] **Memoization**: Is the component wrapped in `React.memo()`? Are props memoized?
- [ ] **Responsive UI**: Are `wp` and `hp` used for dimensions?
- [ ] **Error Handling**: Are all async/DB calls wrapped in try-catch with user feedback?
- [ ] **Platform Check**: Is `Platform.select` used where iOS/Android behavior differs?
- [ ] **Native Integration**: Does it respect `SafeAreaView` and notch constraints?

## Standard Output Format
For every implementation, output:
- **Plan**: A brief 3-bullet summary of the changes.
- **File Changes**: The actual code blocks with file paths.
- **Verification**: A note on why this approach is performant (e.g., "Reduced re-renders via useMemo").
