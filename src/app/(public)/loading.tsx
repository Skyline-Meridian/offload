import { Spinner } from '@/components/ui/spinner'

export default function Loading(): React.JSX.Element {
  return (
    <div className="flex justify-center py-4xl">
      <Spinner />
    </div>
  )
}
