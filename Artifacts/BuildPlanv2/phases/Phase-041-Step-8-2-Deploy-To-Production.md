# Phase 041: Step 8.2 - Deploy to Production

**Status:** Deployment Stage (Step 8.2) | **Phase Number:** 041 | **Epic:** 5

## Objective

Implement deployment execution tracking that records the actual deployment to production. This phase captures deployment method, execution details, deployment URL, and timestamp, creating an immutable record of when the system was deployed live.

## Prerequisites

- Phase 040 complete: Deployment preparation checklist finished
- Route `/org/[orgSlug]/project/[projectId]/helix/step/8.2/` available
- Production environment accessible
- Deployment logs collection capability

## Epic Context (Epic 5)

Phase 041 is the execution step where code actually goes to production. This phase doesn't automate the deployment itself (that's left to the user's CI/CD pipeline), but rather provides a form to record the deployment details and verify it succeeded.

## Context

Deployment execution in Foundry follows the principle of transparency. The user:
1. Executes their deployment (via their CI/CD, Docker, manual scripts, etc.)
2. Records the deployment method and steps taken
3. Provides the production URL
4. Optionally uploads deployment logs
5. Optionally provides screenshot proof
6. The system verifies the deployment is live
7. Records timestamp and status

The status progresses: deploying → deployed → verified

## Detailed Requirements with Code

### 1. Database Schema: Deployment Record

```sql
CREATE TABLE helix_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  helix_process_id UUID NOT NULL REFERENCES helix_processes(id) ON DELETE CASCADE,

  deployment_method VARCHAR(255),
  deployment_steps TEXT,
  production_url VARCHAR(512),
  deployment_timestamp TIMESTAMP,

  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  deployed_by UUID REFERENCES auth.users(id),
  deployed_at TIMESTAMP,

  verification_status VARCHAR(50),
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES auth.users(id),

  deployment_logs_url VARCHAR(512),
  screenshot_url VARCHAR(512),

  evidence_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(helix_process_id)
);

CREATE INDEX idx_helix_deployments_project_id ON helix_deployments(project_id);
CREATE INDEX idx_helix_deployments_status ON helix_deployments(status);
```

### 2. Server Actions: Deployment Execution

Create `/app/actions/helix/deployment.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function createDeploymentRecord(
  projectId: string,
  helixProcessId: string,
  deploymentMethod: string,
  deploymentSteps: string,
  productionUrl: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  // Validate URL format
  try {
    new URL(productionUrl);
  } catch {
    throw new Error('Invalid production URL');
  }

  // Check if deployment record exists
  const { data: existing } = await supabase
    .from('helix_deployments')
    .select('id')
    .eq('helix_process_id', helixProcessId)
    .single();

  if (existing) {
    throw new Error('Deployment already recorded for this process');
  }

  const { data, error } = await supabase
    .from('helix_deployments')
    .insert({
      project_id: projectId,
      helix_process_id: helixProcessId,
      deployment_method: deploymentMethod,
      deployment_steps: deploymentSteps,
      production_url: productionUrl,
      status: 'deploying',
      deployed_by: user.id,
      deployed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeploymentStatus(
  projectId: string,
  deploymentId: string,
  status: 'deploying' | 'deployed' | 'verified',
  logsUrl?: string,
  screenshotUrl?: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (logsUrl) updateData.deployment_logs_url = logsUrl;
  if (screenshotUrl) updateData.screenshot_url = screenshotUrl;

  if (status === 'deployed') {
    updateData.verification_status = 'pending';
  }

  if (status === 'verified') {
    updateData.verified_at = new Date().toISOString();
    updateData.verified_by = user.id;
    updateData.verification_status = 'verified';
  }

  const { error } = await supabase
    .from('helix_deployments')
    .update(updateData)
    .eq('id', deploymentId)
    .eq('project_id', projectId);

  if (error) throw error;

  return { success: true };
}

export async function getDeploymentRecord(
  projectId: string,
  helixProcessId: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('helix_deployments')
    .select('*')
    .eq('project_id', projectId)
    .eq('helix_process_id', helixProcessId)
    .single();

  if (error && error.code === 'PGRST116') {
    return null; // No deployment record yet
  }

  if (error) throw error;
  return data;
}

export async function verifyDeployment(
  projectId: string,
  deploymentId: string,
  productionUrl: string
) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('Unauthorized');

  try {
    // Attempt to fetch the production URL
    const response = await fetch(productionUrl, {
      method: 'HEAD',
      redirect: 'follow',
      timeout: 5000
    });

    const isLive = response.status < 400; // 2xx or 3xx status codes

    const verificationStatus = isLive ? 'verified' : 'failed';

    const { error } = await supabase
      .from('helix_deployments')
      .update({
        verification_status: verificationStatus,
        verified_at: isLive ? new Date().toISOString() : null,
        verified_by: isLive ? user.id : null
      })
      .eq('id', deploymentId)
      .eq('project_id', projectId);

    if (error) throw error;

    return {
      live: isLive,
      status: response.status,
      verificationStatus
    };
  } catch (error) {
    console.error('Deployment verification failed:', error);
    return {
      live: false,
      error: 'Could not verify deployment (network error)',
      verificationStatus: 'failed'
    };
  }
}
```

### 3. React Component: Deployment Execution Form

Create `/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/8.2/components/DeploymentExecutionForm.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import {
  createDeploymentRecord,
  updateDeploymentStatus,
  getDeploymentRecord,
  verifyDeployment
} from '@/app/actions/helix/deployment';

interface DeploymentExecutionFormProps {
  projectId: string;
  orgSlug: string;
  helixProcessId: string;
}

export default function DeploymentExecutionForm({
  projectId,
  orgSlug,
  helixProcessId
}: DeploymentExecutionFormProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<'form' | 'executing' | 'verification'>('form');
  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Form state
  const [deploymentMethod, setDeploymentMethod] = useState('');
  const [deploymentSteps, setDeploymentSteps] = useState('');
  const [productionUrl, setProductionUrl] = useState('');
  const [logsUrl, setLogsUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadDeployment();
  }, [projectId, helixProcessId]);

  const loadDeployment = async () => {
    try {
      const record = await getDeploymentRecord(projectId, helixProcessId);
      if (record) {
        setDeployment(record);
        setDeploymentMethod(record.deployment_method);
        setDeploymentSteps(record.deployment_steps);
        setProductionUrl(record.production_url);
        setLogsUrl(record.deployment_logs_url || '');
        setScreenshotUrl(record.screenshot_url || '');

        // Set phase based on status
        if (record.status === 'verified') {
          setPhase('verification');
        } else if (record.status === 'deployed') {
          setPhase('executing');
        } else {
          setPhase('form');
        }
      }
    } catch (error) {
      console.error('Failed to load deployment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeployment = async () => {
    setError('');

    if (!deploymentMethod || !deploymentSteps || !productionUrl) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const record = await createDeploymentRecord(
        projectId,
        helixProcessId,
        deploymentMethod,
        deploymentSteps,
        productionUrl
      );

      setDeployment(record);
      setPhase('executing');
    } catch (error: any) {
      setError(error.message || 'Failed to create deployment record');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDeployed = async () => {
    setError('');
    setLoading(true);

    try {
      await updateDeploymentStatus(
        projectId,
        deployment.id,
        'deployed',
        logsUrl || undefined,
        screenshotUrl || undefined
      );

      const updated = await getDeploymentRecord(projectId, helixProcessId);
      setDeployment(updated);
      setPhase('verification');
    } catch (error: any) {
      setError(error.message || 'Failed to update deployment status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDeployment = async () => {
    setVerifying(true);
    try {
      const result = await verifyDeployment(
        projectId,
        deployment.id,
        deployment.production_url
      );

      if (result.live) {
        await updateDeploymentStatus(projectId, deployment.id, 'verified');
        const updated = await getDeploymentRecord(projectId, helixProcessId);
        setDeployment(updated);
      } else {
        setError(
          result.error || `Deployment verification failed (status: ${result.status})`
        );
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading && !deployment) {
    return <div className="animate-pulse">Loading deployment...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deploy to Production (Step 8.2)</h1>
          <p className="text-gray-600 mt-1">Execute deployment and record production URL</p>
        </div>
        <Link href={`/org/${orgSlug}/project/${projectId}/helix`}>
          <Button variant="outline">Back to Helix</Button>
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Phase 1: Record Deployment Details */}
      {phase === 'form' && !deployment && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Execution Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Before filling this form, execute your deployment using your CI/CD pipeline or
                deployment tools. This form records the deployment details for audit purposes.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="method" className="text-base font-semibold">
                Deployment Method *
              </Label>
              <Input
                id="method"
                placeholder="e.g., GitHub Actions, GitLab CI, Docker, Kubernetes, Vercel, AWS Amplify"
                value={deploymentMethod}
                onChange={e => setDeploymentMethod(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                What tool or service was used for deployment
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="steps" className="text-base font-semibold">
                Deployment Steps Taken *
              </Label>
              <Textarea
                id="steps"
                placeholder="Describe the steps taken to deploy (e.g., 'Pushed to main branch, GitHub Actions triggered build, deployed to AWS Lambda...')"
                value={deploymentSteps}
                onChange={e => setDeploymentSteps(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="text-base font-semibold">
                Production URL *
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://app.example.com"
                value={productionUrl}
                onChange={e => setProductionUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                URL to access the deployed application
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logs" className="text-base font-semibold">
                Deployment Logs URL
              </Label>
              <Input
                id="logs"
                type="url"
                placeholder="https://github.com/user/repo/actions/runs/12345"
                value={logsUrl}
                onChange={e => setLogsUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Link to deployment logs (GitHub Actions, CI/CD dashboard, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot" className="text-base font-semibold">
                Screenshot URL
              </Label>
              <Input
                id="screenshot"
                type="url"
                placeholder="https://example.com/screenshot.png"
                value={screenshotUrl}
                onChange={e => setScreenshotUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Screenshot showing the deployed application
              </p>
            </div>

            <Button
              onClick={handleCreateDeployment}
              disabled={!deploymentMethod || !deploymentSteps || !productionUrl || loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? 'Recording...' : 'Record Deployment'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: Deployment Recorded - Executing */}
      {phase === 'executing' && deployment && (
        <div className="space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Deployment In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700">
                Deployment recorded at {new Date(deployment.deployed_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deployment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Method</p>
                <p className="font-mono text-sm">{deployment.deployment_method}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-semibold">Steps</p>
                <p className="text-sm whitespace-pre-wrap">{deployment.deployment_steps}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-semibold">Production URL</p>
                <a
                  href={deployment.production_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {deployment.production_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {deployment.deployment_logs_url && (
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Deployment Logs</p>
                  <a
                    href={deployment.deployment_logs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    View Logs
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription>
              Deployment details recorded. Now verify the deployment is live by checking the
              production URL, then mark as deployed below.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleMarkDeployed}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {loading ? 'Updating...' : 'Mark as Deployed & Proceed to Verification'}
          </Button>
        </div>
      )}

      {/* Phase 3: Verification */}
      {phase === 'verification' && deployment && (
        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Deployment Recorded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-700">
                Deployment marked as deployed at{' '}
                {deployment.deployed_at
                  ? new Date(deployment.deployed_at).toLocaleString()
                  : 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verify Production Deployment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 font-semibold mb-2">Production URL</p>
                <div className="flex items-center gap-2">
                  <a
                    href={deployment.production_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex-1"
                  >
                    {deployment.production_url}
                  </a>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Click the "Verify Deployment" button below to automatically check if the
                  production URL is live and accessible. The system will attempt to connect to the
                  deployment URL.
                </AlertDescription>
              </Alert>

              {deployment.verification_status && (
                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-semibold mb-1">Verification Status</p>
                  <Badge
                    variant={
                      deployment.verification_status === 'verified' ? 'success' : 'secondary'
                    }
                  >
                    {deployment.verification_status.toUpperCase()}
                  </Badge>
                </div>
              )}

              <Button
                onClick={handleVerifyDeployment}
                disabled={verifying || deployment.verification_status === 'verified'}
                className="w-full"
                size="lg"
              >
                {verifying ? 'Verifying...' : 'Verify Deployment'}
              </Button>
            </CardContent>
          </Card>

          {deployment.verification_status === 'verified' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Deployment Verified!</AlertTitle>
              <AlertDescription className="text-green-700">
                Production deployment is live and accessible. Proceed to post-deployment
                verification (Step 8.3).
              </AlertDescription>
            </Alert>
          )}

          <Link href={`/org/${orgSlug}/project/${projectId}/helix/step/8.3/`}>
            <Button
              disabled={deployment.verification_status !== 'verified'}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Proceed to Post-Deployment Verification
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
```

## File Structure

```
/app/(app)/org/[orgSlug]/project/[projectId]/helix/step/8.2/
├── page.tsx (route handler)
├── components/
│   └── DeploymentExecutionForm.tsx (deployment form)
/app/actions/helix/
├── deployment.ts (server actions)
```

## Dependencies

- React hooks: `useState`, `useEffect`
- UI Components: `Card`, `Button`, `Input`, `Textarea`, `Label`, `Alert`, `Badge`
- Icons: `lucide-react` (AlertCircle, CheckCircle2, Clock, ExternalLink, RefreshCw)

## Tech Stack

- **Frontend:** Next.js 16+, TypeScript, React, Tailwind CSS v4
- **Backend:** Supabase PostgreSQL
- **State:** React hooks + Server Actions

## Acceptance Criteria

1. Form captures deployment method, steps, and production URL (required fields)
2. Optional fields for deployment logs URL and screenshot URL
3. Creates deployment record when form submitted
4. Phase transitions: form → executing → verification
5. Deployment details displayed after recording
6. Production URL is clickable link to the deployed app
7. "Verify Deployment" button attempts to access production URL
8. Verification updates status to "verified" if URL is live
9. Only allows advancement to Step 8.3 after verification succeeds
10. Deployment timestamp and who deployed recorded immutably

## Testing Instructions

1. **Create Deployment Record:**
   - Navigate to Step 8.2
   - Fill in deployment method, steps, and URL
   - Click "Record Deployment"
   - Verify record created and phase advances

2. **Form Validation:**
   - Try submitting without required fields
   - Verify button disabled until all filled

3. **URL Validation:**
   - Try invalid URL format
   - Verify error message

4. **Deployment Information:**
   - Record deployment
   - Verify all information displays
   - Verify URL is clickable

5. **Mark as Deployed:**
   - Click "Mark as Deployed"
   - Verify phase changes to verification

6. **Verify Production:**
   - Click "Verify Deployment"
   - Verify system attempts connection
   - Verify status updates

7. **Verification Success:**
   - With live deployment, verify status shows "verified"
   - Verify next step button enables

8. **Logs Link:**
   - Add logs URL
   - Verify link is clickable and external

9. **Persistence:**
   - Complete deployment
   - Navigate away and back
   - Verify data persisted

10. **Responsive Design:**
    - Test on mobile
    - Verify forms readable
    - Verify buttons accessible

## Notes for AI Agent

- Phase 041 records deployment execution, not automated deployment
- The user must deploy via their own CI/CD or tools first
- The form serves as documentation of the deployment
- URL verification is automatic via simple HTTP HEAD request
- Consider adding retry logic for URL verification in case of transient failures
- Deployment logs URL is optional but useful for audit trail
- The timestamp records when deployment was marked, not when it actually happened
- Only one deployment record per helix process
- The phase cannot be reused for multiple deployment attempts
- If deployment fails, user would need to roll back and start a new helix process
