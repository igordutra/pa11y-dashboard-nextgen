import { cn } from "@/lib/utils";

interface PageHeadingProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeading({ title, description, children, className }: PageHeadingProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", className)}>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800">{title}</h1>
                {description && <p className="text-slate-500 mt-1 font-medium">{description}</p>}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    );
}
