'use client';

import { ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

import { addressUrl, shortHex } from '@/lib/explorer';
import { formatUsd } from '@/lib/money';
import { useReducedMotionSafe } from '@/lib/motion/useReducedMotionSafe';
import { fadeUp, stagger, withReduced } from '@/lib/motion/variants';

import { useAuth } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { useSettings } from '@/hooks/useSettings';
import { useSpendPermission } from '@/hooks/useSpendPermission';
import { toast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';


import { PresetSlider } from '@/components/recommend/Slider';
import { Attribution } from '@/components/ui/Attribution';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { AllocationControls } from '@/components/wallet/AllocationControls';
import { SpendPermissionCard } from '@/components/wallet/SpendPermissionCard';

export default function SettingsPage() {
  const reduced = useReducedMotionSafe();
  const me = useMe();
  const settings = useSettings();
  const auth = useAuth();
  const permission = useSpendPermission();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const forceReduced = useUiStore((s) => s.forceReducedMotion);
  const setForceReduced = useUiStore((s) => s.setForceReducedMotion);

  if (me.isPending || !me.data) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-48" pill />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  const user = me.data;
  const save = (patch: Parameters<typeof settings.mutate>[0]) => {
    settings.mutate(patch, {
      onError: () => {
        toast.error('Could not save settings');
      },
    });
  };
  const explorer = addressUrl(user.tempo_address);

  return (
    <motion.div variants={withReduced(stagger({ each: 0.07 }), reduced)} initial="hidden" animate="visible" className="space-y-8">
      <motion.header variants={withReduced(fadeUp, reduced)} className="space-y-1">
        <p className="num text-2xs tracking-label text-text-2 uppercase">settings</p>
        <h1 className="font-display text-display-sm text-text-0">
          Allocation &amp; <span className="text-beam">preferences</span>
        </h1>
      </motion.header>

      <motion.section variants={withReduced(fadeUp, reduced)} className="space-y-3" aria-label="Allocation">
        <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Agent allocation</p>
        <AllocationControls
          allocation={user.allocation}
          weeklyLimit={user.weekly_limit}
          autoFreeFallback={user.auto_free_fallback}
          disabled={settings.isPending}
          onChange={(p) => {
            save({
              ...(p.allocation !== undefined ? { allocation: p.allocation } : {}),
              ...(p.weekly_limit !== undefined ? { weekly_limit: p.weekly_limit } : {}),
              ...(p.auto_free_fallback !== undefined ? { auto_free_fallback: p.auto_free_fallback } : {}),
            });
          }}
        />
        <p className="text-xs text-text-2">
          Per-user cap $5/day applies as well. Whether session deposits count against the on-chain spend limit is being confirmed on testnet.
        </p>
      </motion.section>

      <motion.section variants={withReduced(fadeUp, reduced)} className="glass space-y-2 rounded-lg p-4" aria-label="Default slider">
        <PresetSlider value={user.slider} onChange={(slider) => { save({ slider }); }} disabled={settings.isPending} />
        <p className="text-xs text-text-2">Default for new chats. Each chat can override it.</p>
      </motion.section>

      <motion.section variants={withReduced(fadeUp, reduced)}>
        <SpendPermissionCard
          status={permission.permissionStatus}
          expiresAt={permission.data?.expiresAt ?? null}
          busy={permission.approve.isPending || permission.revoke.isPending}
          onApprove={() => {
            permission.approve.mutate();
          }}
          onRevoke={() => {
            permission.revoke.mutate();
          }}
        />
      </motion.section>

      <motion.section variants={withReduced(fadeUp, reduced)} className="glass space-y-2 rounded-lg p-4" aria-label="Wallet">
        <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Wallet</p>
        <p className="num flex items-center gap-2 text-sm text-text-0">
          {shortHex(user.tempo_address, 8, 6)}
          {explorer && (
            <a href={explorer} target="_blank" rel="noopener noreferrer" aria-label="View on explorer" className="text-accent-2">
              <ExternalLink size={14} />
            </a>
          )}
        </p>
        <p className="text-xs text-text-2">Balances are read live from Tempo and never stored. Allocation currently set to {formatUsd(user.allocation, { min: 0 })} USDC.e.</p>
      </motion.section>

      <motion.section variants={withReduced(fadeUp, reduced)} className="space-y-3" aria-label="Appearance">
        <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Appearance</p>
        <Switch label="Light theme" checked={theme === 'light'} onChange={(on) => { setTheme(on ? 'light' : 'dark'); }} className="glass rounded-lg p-3" />
        <Switch label="Reduce motion" description="Opacity-only transitions, no WebGL" checked={forceReduced} onChange={setForceReduced} className="glass rounded-lg p-3" />
      </motion.section>

      <motion.section variants={withReduced(fadeUp, reduced)} className="space-y-2" aria-label="Account">
        <p className="num text-2xs tracking-wider-ui text-text-2 uppercase">Account</p>
        <Button
          variant="danger"
          size="sm"
          loading={auth.signOut.isPending}
          onClick={() => {
            auth.signOut.mutate(undefined, {
              onSettled: () => {
                window.location.assign('/');
              },
            });
          }}
        >
          Sign out
        </Button>
        <p className="text-xs text-text-2">Signing out clears this device&apos;s session. Your allocation stays open until it is idle for 24 h.</p>
      </motion.section>

      <motion.footer variants={withReduced(fadeUp, reduced)} className="space-y-1 text-xs text-text-2">
        <Attribution />
        <p>LMArena leaderboard data is CC-BY-4.0. Models are available via MPP gateways (Tempo, Locus); SmartRouter is not partnered with the model companies.</p>
      </motion.footer>
    </motion.div>
  );
}
