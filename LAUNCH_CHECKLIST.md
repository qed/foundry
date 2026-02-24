# Helix Foundry — Production Launch Checklist

## Pre-Launch

### Infrastructure
- [ ] Domain registered and DNS configured
- [ ] SSL certificate valid (auto via Vercel)
- [ ] Vercel project linked and environment variables set
- [ ] Supabase project on paid plan with backups enabled
- [ ] Health check endpoint verified: `GET /api/health`

### Security
- [ ] All RLS policies reviewed and verified
- [ ] Security headers confirmed (X-Content-Type-Options, X-Frame-Options, etc.)
- [ ] Rate limiting active on public endpoints
- [ ] Input sanitization in place
- [ ] No secrets committed to git history
- [ ] CORS configured for production domains only
- [ ] `npm audit` shows no high-severity vulnerabilities

### Testing
- [ ] All unit tests pass: `npm run test`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Type check passes: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] Manual QA of core flows complete

### Core Flows Verified
- [ ] User signup and login
- [ ] Organization creation
- [ ] Project creation
- [ ] Hall: Create, edit, delete, promote ideas
- [ ] Pattern Shop: Feature tree CRUD, requirements editing
- [ ] Control Room: Blueprint CRUD, version history
- [ ] Assembly Floor: Work order lifecycle, kanban, phases
- [ ] Insights Lab: Feedback submission, triage, conversion
- [ ] Cross-module: Comments, mentions, notifications, artifacts
- [ ] Settings: Profile, org settings, integrations

### Performance
- [ ] Lighthouse score > 90 on key pages
- [ ] LCP < 2.5s on initial load
- [ ] No memory leaks in long-running sessions
- [ ] Bundle size reasonable (check `.next/static/`)

### Documentation
- [ ] Help page complete: `/help`
- [ ] API docs available: `/docs/api`
- [ ] .env.example up to date
- [ ] Keyboard shortcuts documented

---

## Launch Day

### Hour Before
- [ ] Verify all systems operational
- [ ] Test signup flow end-to-end on production URL
- [ ] Check monitoring dashboards
- [ ] Alert team to standby

### Go Live
- [ ] Enable public signup
- [ ] Send launch announcement
- [ ] Update status page

### First Hour
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check for user-reported issues
- [ ] Verify uptime monitoring active

---

## Post-Launch

### Week 1
- [ ] Gather user feedback
- [ ] Fix any critical issues
- [ ] Monitor performance trends
- [ ] Document lessons learned

### Month 1
- [ ] Analyze user behavior
- [ ] Optimize based on usage patterns
- [ ] Update docs based on user confusion points
- [ ] Plan next feature wave

### Ongoing
- [ ] Daily: Monitor error rates
- [ ] Weekly: Performance review
- [ ] Monthly: Security audit, dependency updates
- [ ] Quarterly: Feature planning

---

## Incident Response

| Severity | Response Time | Examples |
|----------|--------------|---------|
| Critical | 1 hour | Data loss, full outage, security breach |
| High | 4 hours | Major feature broken, auth issues |
| Medium | 24 hours | Minor feature broken, UI bugs |
| Low | 1 week | Cosmetic issues, minor improvements |
