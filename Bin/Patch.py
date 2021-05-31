#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from uuid import UUID


if __name__ == '__main__':
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
    with open('There.exe', 'rb') as file:
        data = file.read()
    for uuid_pair in uuid_pairs:
        if data.find(uuid_pair[2].bytes_le) >= 0:
            print('The patch has already been applied.')
            sys.exit(1)
    if not os.path.exists('There-Original.exe'):
        with open('There.orig', 'wb') as file:
            file.write(data)
    for uuid_pair in uuid_pairs:
        index = 0
        for i in range(uuid_pair[0]):
            f = data[index:].find(uuid_pair[1].bytes_le)
            if f < 0:
                print('The patch cannot be used with this version of There.')
                sys.exit(1)
            index += f
            data = data[:index] + uuid_pair[2].bytes_le + data[index + 16:]
            index += 1
        if data[index:].find(uuid_pair[1].bytes_le) >= 0:
            print('The patch cannot be used with this version of There.')
            sys.exit(1)
    with open('There.exe', 'wb') as file:
        file.write(data)
    print('The patch was applied successfully.')
