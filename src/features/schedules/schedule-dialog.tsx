'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Sound } from '@/domain/sound';
import {
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
} from '@/domain/schedule';

const formSchema = z.object({
  minutes: z.coerce
    .number({ invalid_type_error: 'Enter a number of minutes.' })
    .min(MIN_INTERVAL_MINUTES, `Minimum is ${MIN_INTERVAL_MINUTES} minutes.`)
    .max(MAX_INTERVAL_MINUTES, `Maximum is ${MAX_INTERVAL_MINUTES} minutes.`),
  repeat: z.boolean(),
});

type FormValues = z.input<typeof formSchema>;
type ParsedValues = z.output<typeof formSchema>;

export function ScheduleDialog({
  open,
  onOpenChange,
  sound,
  onSchedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` schedules a random sound. */
  sound: Sound | null;
  onSchedule: (values: { minutes: number; repeat: boolean }) => void;
}) {
  const form = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { minutes: 5, repeat: false },
  });

  const submit = form.handleSubmit((values) => {
    onSchedule(values);
    onOpenChange(false);
    form.reset();
  });

  const minutesError = form.formState.errors.minutes?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule sound</DialogTitle>
          <DialogDescription>
            {sound
              ? `Play "${sound.displayName}" after a delay.`
              : 'Play a random sound after a delay.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="minutes">
                Minutes ({MIN_INTERVAL_MINUTES}–{MAX_INTERVAL_MINUTES})
              </Label>
              <Input
                id="minutes"
                type="number"
                step="0.5"
                inputMode="decimal"
                aria-invalid={minutesError !== undefined}
                aria-describedby={minutesError ? 'minutes-error' : undefined}
                {...form.register('minutes')}
              />
              {minutesError && (
                <p id="minutes-error" className="text-sm text-destructive">
                  {minutesError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="repeat">Repeat every interval</Label>
              <Switch
                id="repeat"
                checked={form.watch('repeat')}
                onCheckedChange={(checked) =>
                  form.setValue('repeat', checked, { shouldDirty: true })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Schedule</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
