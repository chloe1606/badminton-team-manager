import { clubDirectory } from '../data/clubContacts'
import { Card } from '../components/ui/Card'

export function ClubContactsPage() {
  return (
    <div className="stack">
      <Card>
        <h1>Club Contacts</h1>
        <p>
          League club contacts and venue details, including structured venue notes where clubs
          use multiple addresses or match-night instructions.
        </p>
      </Card>

      <section className="stack" aria-label="Club contacts list">
        {clubDirectory.map((club) => (
          <Card key={club.id}>
            <div className="card-heading">
              <h2>{club.name}</h2>
              <p className="muted">
                {club.contacts.length} contact{club.contacts.length === 1 ? '' : 's'} ·{' '}
                {club.addresses.length} venue{club.addresses.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="responsive-columns">
              <section>
                <h3>Match secretaries</h3>
                <ul className="detail-list">
                  {club.contacts.map((contact) => (
                    <li key={contact.id}>
                      <strong>{contact.name}</strong>
                      <br />
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      <br />
                      <a href={`tel:${contact.phone.replace(/\s+/g, '')}`}>{contact.phone}</a>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Venues</h3>
                <ul className="detail-list">
                  {club.addresses.map((address) => (
                    <li key={address.id}>
                      <strong>{address.venueName}</strong>
                      <br />
                      {address.address}
                      {address.notes ? <p className="muted venue-note">Notes: {address.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </Card>
        ))}
      </section>
    </div>
  )
}
