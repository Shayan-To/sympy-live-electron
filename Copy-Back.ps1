In-Directory $PSScriptRoot {
    @(In-Directory .\electrostatic { Dir -Force -Recurse -File | Resolve-Path -Relative }) | % {
        Copy (Join-Path .\sympy-live\_output $_) (Join-Path .\electrostatic $_)
    }
    @(In-Directory .\sympy-live-extras { Dir -Force -Recurse -File | Resolve-Path -Relative }) | % {
        Copy (Join-Path .\sympy-live\_output $_) (Join-Path .\sympy-live-extras $_)
    }
}
