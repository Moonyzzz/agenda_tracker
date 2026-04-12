'use client'

interface Props {
  children: React.ReactNode
  confirmMessage: string
  className?: string
}

export default function ConfirmSubmitButton({ children, confirmMessage, className }: Props) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!confirm(confirmMessage)) {
          event.preventDefault()
        }
      }}
    >
      {children}
    </button>
  )
}
