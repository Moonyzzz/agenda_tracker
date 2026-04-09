'use client'

import { useRef } from 'react'
import { deletePlanner } from '@/app/planners/actions'

interface Props {
  plannerId: string
  plannerName: string
}

export function DeletePlannerButton({ plannerId, plannerName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        Delete planner
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xl backdrop:bg-black/40 w-full max-w-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close()
        }}
      >
        <h3 className="text-base font-semibold text-stone-900">
          Delete &ldquo;{plannerName}&rdquo;?
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          This will permanently delete the planner and all its events, members, and data. This cannot be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
          <form action={deletePlanner}>
            <input type="hidden" name="planner_id" value={plannerId} />
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Delete
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
