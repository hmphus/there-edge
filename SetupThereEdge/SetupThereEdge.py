#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from version import VERSION
from uuid import UUID
from win32com.shell import shell, shellcon
from win32com.client import pythoncom as com
from argparse import ArgumentParser


if __name__ == '__main__':
    print('ThereEdge %s\n' % VERSION)
    for i, argv in enumerate(sys.argv):
        if argv.startswith('--desktop='):
            if argv[10:] == '1':
                sys.argv[i] = '--desktop'
            else:
                del sys.argv[i]
            break
    parser = ArgumentParser()
    parser.add_argument('--path', type=str, default='.', help='client path')
    parser.add_argument('--pause', action='store_true', help='pause on error')
    parser.add_argument('--patch', action='store_true', help='patch the client')
    parser.add_argument('--register', action='store_true', help='register the libraries')
    parser.add_argument('--unregister', action='store_true', help='unregister the libraries')
    parser.add_argument('--startmenu', action='store_true', help='create a start menu shortcut')
    parser.add_argument('--desktop', action='store_true', help='create a desktop shortcut')
    args = parser.parse_args()
    if not args.patch and not args.register and not args.unregister and not args.startmenu and not args.desktop:
         parser.print_usage()
         sys.exit(0)
    try:
        args.path = args.path.rstrip()
        if args.patch:
            uuid_pairs = [
                [1, UUID('D27CDB6B-AE6D-11CF-96B8-444553540000'), UUID('682E7C31-6CE3-4FB3-9883-479ED34CB1B9')],  # ShockwaveFlash TypeLib
                [1, UUID('D27CDB6C-AE6D-11CF-96B8-444553540000'), UUID('6B3DDCCB-B754-4D73-9E49-65B4AAD1EEAF')],  # IShockwaveFlash
                [1, UUID('D27CDB6D-AE6D-11CF-96B8-444553540000'), UUID('543E9E91-C412-43DD-A12A-3F5AA34758D1')],  # IShockwaveFlashEvents
                [1, UUID('D27CDB6E-AE6D-11CF-96B8-444553540000'), UUID('71E05279-CB7A-496A-8EE9-D700955CA40C')],  # ShockwaveFlash CLSID
                [0, UUID('EAB22AC0-30C1-11CF-A7EB-0000C05BAE0B'), UUID('E792F884-FF4C-4563-92FE-ADAEA759F2EA')],  # WebBrowser TypeLib
                [0, UUID('EAB22AC1-30C1-11CF-A7EB-0000C05BAE0B'), UUID('2170EFE4-F488-4F5C-A844-469080351EC4')],  # IWebBrowser
                [0, UUID('0002DF05-0000-0000-C000-000000000046'), UUID('825FAF08-F4AF-46BE-8F65-4D6F73185E60')],  # IWebBrowserApp
                [2, UUID('D30C1661-CDAF-11d0-8A3E-00C04FC9E26E'), UUID('65CD626F-FDC0-417C-BAAC-CC90E4FEBA16')],  # IWebBrowser2
                [0, UUID('EAB22AC2-30C1-11CF-A7EB-0000C05BAE0B'), UUID('DD68CD11-4932-435D-AE85-554A61B4D6F5')],  # DWebBrowserEvents
                [1, UUID('34A715A0-6587-11D0-924A-0020AFC7AC4D'), UUID('A6601B01-4A9A-458A-A9D4-AA4207757056')],  # DWebBrowserEvents2
                [2, UUID('8856F961-340A-11D0-A96B-00C04FD705A2'), UUID('4D5AA1D8-B2D9-49D0-860E-8DAF2EC2CF0C')],  # WebBrowser CLSID
            ]
            with open(os.path.join(args.path, 'There.exe'), 'rb') as file:
                data = file.read()
            for uuid_pair in uuid_pairs:
                if data.find(uuid_pair[2].bytes_le) >= 0:
                    raise RuntimeError('The patch has already been applied.')
            for uuid_pair in uuid_pairs:
                index = 0
                for i in range(uuid_pair[0]):
                    f = data[index:].find(uuid_pair[1].bytes_le)
                    if f < 0:
                        raise RuntimeError('The patch cannot be used with this version of There.')
                    index += f
                    data = data[:index] + uuid_pair[2].bytes_le + data[index + 16:]
                    index += 1
                if data[index:].find(uuid_pair[1].bytes_le) >= 0:
                    raise RuntimeError('The patch cannot be used with this version of There.')
            with open(os.path.join(args.path, 'ThereEdge.exe'), 'wb') as file:
                file.write(data)
            print('The patch was applied successfully.')
        proxy_names = ['BrowserProxy', 'FlashProxy']
        if args.register:
            for name in proxy_names:
                rc = os.system('regsvr32 /s "%s.dll"' % os.path.join(args.path, name))
                if rc != 0:
                    raise RuntimeError('Registration of %s failed (%s).' % (name, rc))
                else:
                    print('%s was registered successfully.' % name)
        if args.unregister:
            for name in proxy_names:
                rc = os.system('regsvr32 /u /s "%s.dll"' % os.path.join(args.path, name))
                if rc != 0 and rc != 5:
                    print('Unregistration of %s failed (%s).' % (name, rc))
                else:
                    print('%s was unregistered successfully.' % name)
        if args.startmenu or args.desktop:
            shortcut = com.CoCreateInstance(shell.CLSID_ShellLink, None, com.CLSCTX_INPROC_SERVER, shell.IID_IShellLink)
            file = shortcut.QueryInterface(com.IID_IPersistFile)
            file.Load(os.path.join(args.path, 'Sign on to There.lnk'))
            shortcut.SetWorkingDirectory(os.path.abspath(args.path))
            shortcut.SetPath(os.path.join(os.path.abspath(args.path), 'ThereEdge.exe'))
            count = 0
            if args.startmenu:
                try:
                    os.mkdir(os.path.join(shell.SHGetFolderPath(0, shellcon.CSIDL_PROGRAMS, 0, 0), 'There'))
                except FileExistsError:
                    pass
                file.Save(os.path.join(shell.SHGetFolderPath(0, shellcon.CSIDL_PROGRAMS, 0, 0), 'There', 'There (Edge).lnk'), 0)
                count += 1
            if args.desktop:
                file.Save(os.path.join(shell.SHGetFolderPath(0, shellcon.CSIDL_DESKTOP, 0, 0), 'There (Edge).lnk'), 0)
                count += 1
            if count == 1:
                print('The shortcut was created successfully.')
            elif count > 1:
                print('The shortcuts were created successfully.')
    except RuntimeError as e:
        print(e)
        if args.pause:
            input('Press Enter to continue.\n')
        sys.exit(1)
    sys.exit(0)