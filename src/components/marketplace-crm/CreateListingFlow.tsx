import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2 } from 'lucide-react';
import { DocumentUploader } from './DocumentUploader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateMarketplaceListing, useVacantUnpublishedUnits, type VacantMarketplaceUnit } from '@/hooks/useMarketplace';

type CreateListingFlowProps = {
  companyId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUnitId?: string | null;
};

const STEP_LABELS = ['Unit', 'Details', 'Media', 'Review'];

export function CreateListingFlow({ companyId, open, onOpenChange, initialUnitId }: CreateListingFlowProps) {
  const unitsQuery = useVacantUnpublishedUnits(companyId);
  const createListing = useCreateMarketplaceListing(companyId);
  const [step, setStep] = useState(0);
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [rentAmount, setRentAmount] = useState('0');
  const [bedrooms, setBedrooms] = useState('0');
  const [bathrooms, setBathrooms] = useState('0');
  const [availableFrom, setAvailableFrom] = useState('');
  const [mediaPaths, setMediaPaths] = useState<string[]>([]);
  const [uploadResetKey, setUploadResetKey] = useState(0);

  const units = useMemo(() => unitsQuery.data || [], [unitsQuery.data]);
  const selectedUnit = units.find((unit) => unit.id === unitId) || null;

  const applyUnit = (unit: VacantMarketplaceUnit) => {
    setUnitId(unit.id);
    setTitle(`${unit.property_name} - Unit ${unit.unit_number}`);
    setDescription(unit.description || '');
    setCity(unit.city);
    setArea(unit.state);
    setRentAmount(String(unit.rent_amount));
    setBedrooms(String(unit.bedrooms));
    setBathrooms(String(unit.bathrooms));
  };

  useEffect(() => {
    if (!open || !units.length) return;
    const initialUnit = units.find((unit) => unit.id === initialUnitId);
    if (initialUnit) applyUnit(initialUnit);
  }, [initialUnitId, open, units]);

  const close = () => {
    onOpenChange(false);
    setStep(0);
    setUnitId('');
    setMediaPaths([]);
  };

  const save = () => {
    if (!selectedUnit) return;
    createListing.mutate({
      unitId: selectedUnit.id,
      propertyId: selectedUnit.property_id,
      title,
      description,
      city,
      area,
      rentAmount: Number(rentAmount),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      availableFrom: availableFrom || null,
      mediaPaths,
    }, { onSuccess: close });
  };

  const canContinue = step === 0
    ? Boolean(selectedUnit)
    : step === 1
      ? Boolean(title.trim() && city.trim() && Number(rentAmount) >= 0)
      : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create marketplace listing</DialogTitle>
          <DialogDescription>Listings start as drafts and can only use vacant units owned by the active company.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {STEP_LABELS.map((label, index) => <div key={label} className={`rounded-md border px-2 py-2 text-center text-xs ${index === step ? 'border-primary bg-primary/10 font-medium' : 'text-muted-foreground'}`}>{index + 1}. {label}</div>)}
        </div>

        {step === 0 && (
          <div className="space-y-2 py-4">
            <Label>Vacant unit</Label>
            <Select value={unitId} onValueChange={(value) => { const unit = units.find((candidate) => candidate.id === value); if (unit) applyUnit(unit); }}>
              <SelectTrigger><SelectValue placeholder={unitsQuery.isLoading ? 'Loading units...' : 'Select a vacant unit'} /></SelectTrigger>
              <SelectContent>{units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.property_name} · Unit {unit.unit_number}</SelectItem>)}</SelectContent>
            </Select>
            {!unitsQuery.isLoading && units.length === 0 && <p className="text-sm text-muted-foreground">No vacant unpublished units are available.</p>}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
            <div><Label>City</Label><Input value={city} onChange={(event) => setCity(event.target.value)} /></div>
            <div><Label>Area</Label><Input value={area} onChange={(event) => setArea(event.target.value)} /></div>
            <div><Label>Monthly rent</Label><Input type="number" min="0" value={rentAmount} onChange={(event) => setRentAmount(event.target.value)} /></div>
            <div><Label>Available from</Label><Input type="date" value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} /></div>
            <div><Label>Bedrooms</Label><Input type="number" min="0" value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} /></div>
            <div><Label>Bathrooms</Label><Input type="number" min="0" step="0.5" value={bathrooms} onChange={(event) => setBathrooms(event.target.value)} /></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <DocumentUploader bucket="listing-media" pathPrefix={`${companyId || 'unknown-company'}/listing-drafts/${unitId}`} acceptedMimeTypes={['image/jpeg', 'image/png', 'image/webp']} maxFileSizeBytes={10 * 1024 * 1024} resetKey={String(uploadResetKey)} uploadLabel="Upload listing photo" onUploaded={(path) => { setMediaPaths((current) => [...current, path]); setUploadResetKey((current) => current + 1); }} />
            <div className="space-y-2">{mediaPaths.map((path, index) => <div key={path} className="flex items-center gap-2 rounded-md border p-2 text-xs"><ImagePlus className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{index === 0 ? 'Cover · ' : ''}{path}</span></div>)}</div>
            <p className="text-xs text-muted-foreground">Photos are optional for the draft and enter media moderation as pending.</p>
          </div>
        )}

        {step === 3 && selectedUnit && (
          <div className="space-y-3 py-4 text-sm">
            <div className="rounded-md border p-3"><p className="font-medium">{title}</p><p className="text-muted-foreground">{selectedUnit.property_name} · Unit {selectedUnit.unit_number}</p></div>
            <div className="grid grid-cols-2 gap-3"><div className="rounded-md border p-3">Rent: {Number(rentAmount).toLocaleString()} NGN</div><div className="rounded-md border p-3">{bedrooms} bed · {bathrooms} bath</div></div>
            <div className="rounded-md border p-3">{city}{area ? `, ${area}` : ''} · {mediaPaths.length} photo(s)</div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" onClick={() => step === 0 ? close() : setStep((current) => current - 1)}><ArrowLeft className="mr-1.5 h-4 w-4" />{step === 0 ? 'Cancel' : 'Back'}</Button>
          {step < 3 ? <Button disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>Next<ArrowRight className="ml-1.5 h-4 w-4" /></Button> : <Button disabled={createListing.isPending} onClick={save}>{createListing.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}Save draft</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}