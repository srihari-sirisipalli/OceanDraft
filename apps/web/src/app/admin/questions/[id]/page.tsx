'use client';

import { QuestionForm } from '@/components/admin/QuestionForm';

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  return <QuestionForm mode="edit" id={params.id} />;
}
