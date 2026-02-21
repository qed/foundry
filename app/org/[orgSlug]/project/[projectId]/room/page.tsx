import Image from 'next/image'

export default function RoomPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <Image src="/icon-room.png" alt="Control Room" width={48} height={48} />
        <h1 className="text-2xl font-bold text-text-primary">Control Room</h1>
      </div>
      <p className="text-text-secondary mb-8">
        Blueprints & management workspace. Coming soon.
      </p>

      <div className="glass-panel rounded-lg p-12 text-center">
        <p className="text-text-tertiary">
          This module will be built in a future phase.
        </p>
      </div>
    </div>
  )
}
