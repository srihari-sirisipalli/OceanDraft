-- Attempt: composite index on (sessionId, status) accelerates the
-- IN_PROGRESS-lookup in AssignmentService.nextForCandidate.
CREATE INDEX "Attempt_sessionId_status_idx" ON "Attempt"("sessionId", "status");

-- ResultTemplate: composite index on (isActive, key) supports the
-- prefix-scan on every answer submission (HOORAY_*, FAIL_*, EXPIRE_*).
CREATE INDEX "ResultTemplate_isActive_key_idx" ON "ResultTemplate"("isActive", "key");
