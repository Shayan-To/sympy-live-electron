In the name of God

# Sympy Live Electron

Build instructions:

- Install python and pipx.
- `git clone https://github.com/sympy/live sympy-live --depth=1`
- `cd .\sympy-live\`
- These are from `sympy-live\.github\workflows\deploy.yml`:
    - `python -m pip install -r requirements.txt`
    - `python -m pip download sympy --only-binary=:all: --no-deps --dest custom_wheels`
    - `pipx run unvendor_tests_from_wheel.py custom_wheels/`
    - `jupyter lite build`
    - `pipx run generate_index.py`
- `cd _output`
- `cp -rf ../../electrostatic/* .` (Pwsh: `cp -Recurse -Force ..\..\electrostatic\* .`)
- `yarn`
- `yarn start`
- Explore all pages you want to be accessible.
- `yarn package`
