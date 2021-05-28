#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from uuid import UUID


if __name__ == '__main__':
    uuid_pairs = [
        [UUID('D27CDB6B-AE6D-11CF-96B8-444553540000'), UUID('682E7C31-6CE3-4FB3-9883-479ED34CB1B9')],  # TypeLib
        [UUID('D27CDB6C-AE6D-11CF-96B8-444553540000'), UUID('6B3DDCCB-B754-4D73-9E49-65B4AAD1EEAF')],  # IShockwaveFlash
        [UUID('D27CDB6D-AE6D-11CF-96B8-444553540000'), UUID('543E9E91-C412-43DD-A12A-3F5AA34758D1')],  # IShockwaveFlashEvents
        [UUID('D27CDB6E-AE6D-11CF-96B8-444553540000'), UUID('71E05279-CB7A-496A-8EE9-D700955CA40C')],  # CLSID
    ]
    with open('There.exe', 'rb') as file:
        data = file.read()
    for uuid_pair in uuid_pairs:
        if data.find(uuid_pair[1].bytes_le) >= 0:
            print('The patch has already been applied.')
            sys.exit(1)
    if not os.path.exists('There.old'):
        with open('There.orig', 'wb') as file:
            file.write(data)
    for uuid_pair in uuid_pairs:
        index = data.find(uuid_pair[0].bytes_le)
        if index < 0 or data[index + 1:].find(uuid_pair[0].bytes_le) >= 0:
            print('The patch cannot be used with this version of There.')
            sys.exit(1)
        data = data[:index] + uuid_pair[1].bytes_le + data[index + 16:]
    with open('There.exe', 'wb') as file:
        file.write(data)
    print('The patch was applied successfully.')
