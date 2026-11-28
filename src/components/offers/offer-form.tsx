'use client'

import { saveOffer } from '@/actions/offer'
import { SingleAddressField } from '@/components/forms/address-field'
import { FormMessage } from '@/components/forms/form-message'
import { RichTextEditor } from '@/components/forms/rich-text-editor'
import { SubmitButton } from '@/components/forms/submit-button'
import { TextField } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { useSection } from '@/hooks/use-section'
import type { OfferEditorData } from '@/lib/view-models/offers'

type Props = {
  offer?: OfferEditorData
  positions: SelectOption[]
  skills: SelectOption[]
  defaultLocation?: { text: string; placeId: string }
}

/** Two buttons: "Save draft" and "Publish". A published offer has one: "Save changes". */
export function OfferForm({ offer, positions, skills, defaultLocation }: Props): React.JSX.Element {
  const { state, formAction, errors } = useSection(saveOffer)
  const isPublished = offer?.status === 'PUBLISHED'
  return (
    <form action={formAction} className="flex flex-col gap-md" noValidate>
      <FormMessage state={state} />
      {offer ? <input type="hidden" name="offerId" value={offer.id} /> : null}
      <TextField name="title" label="Title" defaultValue={offer?.title} isRequired errors={errors('title')} />
      <RichTextEditor name="description" label="Description" defaultValue={offer?.description} errors={errors('description')} hint="Up to 5,000 characters." />
      <Select
        name="paid"
        label="Paid or unpaid"
        placeholder="Choose…"
        required
        defaultValue={offer?.paid}
        options={[
          { value: 'PAID', label: 'Paid' },
          { value: 'UNPAID', label: 'Unpaid' },
        ]}
        errors={errors('paid')}
      />
      <Select name="positionIds" label="Positions" options={positions} multiple defaultValue={offer?.positionIds} hint="Hold Ctrl (Cmd on a Mac) to choose more than one." />
      <Select name="skillIds" label="Skills" options={skills} multiple defaultValue={offer?.skillIds} />
      <SingleAddressField
        name="locationText"
        label="Location"
        defaultValue={offer?.locationText ?? defaultLocation?.text}
        defaultPlaceId={offer?.locationPlaceId ?? defaultLocation?.placeId}
        errors={errors}
      />
      <div className="flex flex-wrap gap-sm">
        {isPublished ? (
          <SubmitButton name="intent" value="update">
            Save changes
          </SubmitButton>
        ) : (
          <>
            <SubmitButton variant="ghost" name="intent" value="draft">
              Save draft
            </SubmitButton>
            <SubmitButton name="intent" value="publish">
              Publish
            </SubmitButton>
          </>
        )}
      </div>
    </form>
  )
}
