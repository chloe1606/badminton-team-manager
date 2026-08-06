import { Card } from '../components/ui/Card'

interface FeaturePageProps {
  title: string
  description: string
}

export function FeaturePage({ title, description }: FeaturePageProps) {
  return (
    <Card>
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="muted">Scaffold ready for upcoming badminton team workflows.</p>
    </Card>
  )
}
