#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sys


def get_version():
    with open('Installer/Installer.vdproj', 'r', encoding='utf-8-sig') as file:
        lines = [l.strip() for l in file.readlines()]
    path = ['']
    for line in lines:
        if line == '{':
            path.append('')
            continue
        if line == '}':
            path.pop()
            continue
        match = re.search(r'"([^"]+)" = "([^"]+)"', line)
        if match is not None:
            path[-1] = match.group(1)            
            if '.'.join(path) == 'DeployProject.Deployable.Product.ProductVersion':
                return match.group(2).split(':')[1]
            continue
        match = re.search(r'"([^"]+)"', line)
        if match is not None:
            path[-1] = match.group(1)
            continue
    return None


def apply_version_rc(name, version):
    with open('%s/%s.rc' % (name, name), 'r', encoding='utf-16') as file:
        lines = [l.rstrip('\n') for l in file.readlines()]
    for (i, line) in enumerate(lines):
        match = re.match(r'^ ([A-Z]+?)VERSION ', line)
        if match is not None:
            line = ' %sVERSION %s' % (
                match.group(1),
                ','.join(version.split('.') + ['0']),
            )
            lines[i] = line

        match = re.match(r'^( +)VALUE "([A-Za-z]+)Version",', line)
        if match is not None:
            line = '%sVALUE "%sVersion", "%s.0"' % (
                match.group(1),
                match.group(2),
                version,
            )
            lines[i] = line
    with open('%s/%s.rc' % (name, name), 'w', encoding='utf-16') as file:
        file.write('\n'.join(lines) + '\n')


def apply_version_py(name, version):
    lines = [
        "# -*- coding: utf-8 -*-",
        "",
        "VERSION = '%s'" % version,
    ]
    with open('%s/version.py' % name, 'w') as file:
        file.write('\n'.join(lines))


if __name__ == '__main__':
    version = get_version()
    print('Version: %s' % version)
    apply_version_rc('BrowserProxy', version)
    apply_version_rc('FlashProxy', version)
    apply_version_py('SetupThereEdge', version)