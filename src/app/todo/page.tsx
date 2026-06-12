import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos } = await supabase.from('todos').select();

  return (
    <div className="min-h-screen bg-cream p-10 font-sans text-charcoal flex flex-col items-center">
      <h1 className="font-serif text-2xl font-bold mb-6">Todos from Supabase</h1>
      <ul className="space-y-2 max-w-md w-full bg-cream-card border border-cream-border p-6 rounded-xl shadow-sm">
        {todos && todos.length > 0 ? (
          todos.map((todo: any) => (
            <li key={todo.id} className="text-sm font-semibold border-b border-cream-border/60 pb-2 last:border-b-0 last:pb-0">
              {todo.name}
            </li>
          ))
        ) : (
          <li className="text-xs text-charcoal-muted italic">No todos found in 'todos' table.</li>
        )}
      </ul>
    </div>
  );
}
