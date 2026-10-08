'use client';

import { ShieldCheck, ShieldOff } from 'lucide-react';
import { motion } from 'motion/react';

import { env } from '@/lib/env';
import { shortHex } from '@/lib/explorer';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { lock, withReduced } from '@/lib/motion/variants';

import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/ui/MagneticButton';

export type SpendPermissionStatus = 'none' | 'granted' | 'expired';

export interface SpendPermissionCardProps {
  status: SpendPermissionStatus;
  expiresAt?: string | null;
  onApprove: () => void;
  onRevoke: () => void;
  busy?: boolean;
}

/**
 * PDF spend permission: access key limited to USDC.e, scoped to session open + top-up with
 * SmartRouter as payee, with an expiry. Shows exactly those facts; one passkey tap; Revoke is plain.
 */
export function SpendPermissionCard({ status, expiresAt, onApprove, onRevoke, busy = false }: SpendPermissionCardProps) {
  const reduced = useReducedMotionSafe();
  const granted = status === 'granted';
  return (
    <section className="glass space-y-3 rounded-lg p-4" aria-label="Spend permission">
      <div className="flex items-center gap-3">
        <motion.span
          className={granted ? 'text-accent-2' : 'text-text-2'}
          variants={withReduced(lock, reduced)}
          animate={granted ? 'locked' : 'idle'}
          aria-hidden="true"
        >
          {granted ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
        </motion.span>
        <div>
          <p className="text-sm text-text-0">Spend permission</p>
          <p className="text-xs text-text-2">
            {granted ? 'Granted' : status === 'expired' ? 'Expired — approve again' : 'Not granted yet'}
            {granted && expiresAt && ` · expires ${new Date(expiresAt).toLocaleDateString()}`}
          </p>
        </div>
      </div>
      <dl className="num grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-text-2">Token</dt>
        <dd className="text-text-0">USDC.e <span className="text-text-2">({shortHex(env.usdceAddress)})</span></dd>
        <dt className="text-text-2">Payee</dt>
        <dd className="text-text-0">SmartRouter <span className="text-text-2">({shortHex(env.smartrouterPayee)})</span></dd>
        <dt className="text-text-2">Scope</dt>
        <dd className="text-text-0">Open and top up sessions only</dd>
      </dl>
      <p className="text-xs text-text-2">A stolen device can only fund SmartRouter sessions, never send money elsewhere.</p>
      {granted ? (
        <Button variant="danger" size="sm" onClick={onRevoke} loading={busy}>
          Revoke
        </Button>
      ) : (
        <MagneticButton size="sm" onClick={onApprove} loading={busy}>
          Approve with passkey
        </MagneticButton>
      )}
    </section>
  );
}
