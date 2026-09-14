-- One-time backfill: historical requests with visitDate → ReceptionScheduledVisit.
-- Approved (past Pending_Manager) → APPROVED so desk can see them on that day.
-- Still Pending_Manager → PENDING_APPROVAL for reception managers only.

INSERT INTO "ReceptionScheduledVisit" (
  "id",
  "visitorName",
  "visitorPhone",
  "organization",
  "visitType",
  "visitTarget",
  "reason",
  "visitTimeSlot",
  "scheduledAt",
  "status",
  "source",
  "title",
  "requestId",
  "approvedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'c' || substr(md5(r.id || ':sched-backfill'), 1, 24),
  CASE
    WHEN NULLIF(TRIM(r."contactName"), '') IS NOT NULL THEN TRIM(r."contactName")
    WHEN NULLIF(TRIM(r.title), '') IS NOT NULL THEN TRIM(r.title)
    ELSE 'زائر'
  END,
  COALESCE(r."contactPhone", ''),
  '',
  '',
  '',
  '',
  CASE
    WHEN EXTRACT(HOUR FROM r."visitDate") >= 15 THEN 'المساء'
    WHEN EXTRACT(HOUR FROM r."visitDate") >= 11 THEN 'الظهر'
    ELSE 'الصباح'
  END,
  r."visitDate",
  CASE
    WHEN r.status = 'Pending_Manager' THEN 'PENDING_APPROVAL'::"VisitScheduleStatus"
    ELSE 'APPROVED'::"VisitScheduleStatus"
  END,
  'REQUEST',
  COALESCE(NULLIF(TRIM(r.title), ''), rt.name, ''),
  r.id,
  CASE
    WHEN r.status = 'Pending_Manager' THEN NULL
    ELSE COALESCE(r."approvedAt", r."createdAt", NOW())
  END,
  NOW(),
  NOW()
FROM "CommunicationRequest" r
INNER JOIN "RequestType" rt ON rt.id = r."requestTypeId"
WHERE r."visitDate" IS NOT NULL
  AND rt."requiresVisitDate" = true
  AND rt.slug <> 'hospitality-booking'
  AND r.status NOT IN ('Rejected', 'Cancelled')
  AND NOT EXISTS (
    SELECT 1
    FROM "ReceptionScheduledVisit" s
    WHERE s."requestId" = r.id
  );
